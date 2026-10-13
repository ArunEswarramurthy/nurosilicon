'use strict';

const { spawn }  = require('child_process');
const fs         = require('fs');
const os         = require('os');
const path       = require('path');
const crypto     = require('crypto');
const { assertHostExecutionAllowed } = require('./executionPolicy');

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_VCD_BYTES    = 512 * 1024;  // 512 KB — enough for most designs

// ── Run-ID: ties every artifact to the exact source+testbench that produced it
function makeRunId(sourceCode, testbench) {
  return crypto
    .createHash('sha1')
    .update(sourceCode + '\x00' + testbench)
    .digest('hex')
    .slice(0, 16);
}

// ── Locate iverilog / vvp ────────────────────────────────────────────────────
const IVERILOG = (() => {
  const candidates = [
    'C:\\iverilog\\bin\\iverilog.exe',
    'C:\\Program Files\\iverilog\\bin\\iverilog.exe',
    'C:\\Program Files (x86)\\iverilog\\bin\\iverilog.exe',
  ];
  for (const p of candidates) { if (fs.existsSync(p)) return p; }
  return 'iverilog';
})();

const VVP = (() => {
  const candidates = [
    'C:\\iverilog\\bin\\vvp.exe',
    'C:\\Program Files\\iverilog\\bin\\vvp.exe',
    'C:\\Program Files (x86)\\iverilog\\bin\\vvp.exe',
  ];
  for (const p of candidates) { if (fs.existsSync(p)) return p; }
  return 'vvp';
})();

// ── Spawn with timeout ───────────────────────────────────────────────────────
function spawnTimeout(cmd, args, opts, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    let proc;
    try {
      proc = spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      return resolve({ stdout: '', stderr: e.message, exitCode: -1, runtimeMs: 0, timedOut: false, notFound: true });
    }
    let stdout = '', stderr = '', killed = false;
    const timer = setTimeout(() => { killed = true; proc.kill('SIGKILL'); }, timeoutMs);
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.stdin.end();
    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: -1, runtimeMs: Date.now() - start, timedOut: false, notFound: err.code === 'ENOENT' });
    });
    proc.on('close', code => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 0, runtimeMs: Date.now() - start, timedOut: killed });
    });
  });
}

// ── Parse PASS/FAIL display line ─────────────────────────────────────────────
// PASS: a=0 b=1 y=1
// FAIL: a=0 b=1 | expected=1 got=0
function parseTestLine(name) {
  if (!name) return { input: '', expected: '', got: '' };
  const pipeIdx = name.indexOf(' | ');
  if (pipeIdx !== -1) {
    const input = name.slice(0, pipeIdx).trim();
    const rest  = name.slice(pipeIdx + 3);
    const expM  = rest.match(/expected=([^\s]+)/);
    const gotM  = rest.match(/got=([^\s]+)/);
    return { input, expected: expM ? expM[1] : rest, got: gotM ? gotM[1] : '' };
  }
  const eqIdx = name.lastIndexOf('=');
  if (eqIdx !== -1) {
    const val = name.slice(eqIdx + 1).trim();
    return { input: name.slice(0, eqIdx).trim(), expected: val, got: val };
  }
  return { input: name, expected: '', got: '' };
}

// ── Main runner ──────────────────────────────────────────────────────────────
async function runVerilog(studentCode, testbench, timeLimitMs = 10000, langType = 'rtl_coding') {
  try {
    assertHostExecutionAllowed();
  } catch (error) {
    return {
      compile_error: error.message,
      results: [],
      waveform_vcd: null,
      runtime_ms: 0,
      passed: 0,
      total: 0,
      execution_unavailable: true,
    };
  }

  if (Buffer.byteLength(studentCode, 'utf8') > MAX_SOURCE_BYTES)
    return { compile_error: 'Source code too large (max 64 KB)', results: [], waveform_vcd: null, runtime_ms: 0, passed: 0, total: 0 };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-'));

  // Use .sv extension for SystemVerilog (lang_type sv or rtl_coding with SV keywords)
  // Always compile with -g2012 to support both Verilog and SystemVerilog syntax
  const studentFile   = path.join(tmpDir, 'solution.v');
  const testbenchFile = path.join(tmpDir, 'testbench.v');
  const outFile       = path.join(tmpDir, 'sim.out');
  const vcdFile       = path.join(tmpDir, 'dump.vcd');

  // Use forward slashes for VCD path (iverilog on Windows needs this)
  const vcdFileFwd = vcdFile.replace(/\\/g, '/');

  // Inject absolute VCD path into testbench so waveform is always captured
  let tbWithVcd = testbench;
  if (testbench.includes('$dumpfile')) {
    tbWithVcd = testbench.replace(/\$dumpfile\s*\(\s*["'].*?["']\s*\)/g, `$dumpfile("${vcdFileFwd}")`);
  } else {
    // No dumpfile — inject after first 'initial begin'
    tbWithVcd = testbench.replace(/initial\s+begin/, `initial begin\n  $dumpfile("${vcdFileFwd}");\n  $dumpvars(0);\n`);
  }

  fs.writeFileSync(studentFile,   studentCode, 'utf8');
  fs.writeFileSync(testbenchFile, tbWithVcd,   'utf8');

  // Always use -g2012 — supports both Verilog-2001 and SystemVerilog-2012 syntax
  // testbench first, then student file (testbench instantiates student module)
  const compileArgs = ['-g2012', '-o', outFile, testbenchFile, studentFile];

  try {
    const compile = await spawnTimeout(IVERILOG, compileArgs, {}, 15000);

    if (compile.notFound)
      return { compile_error: 'iverilog not installed on server. Please install Icarus Verilog.', results: [], waveform_vcd: null, runtime_ms: 0, passed: 0, total: 0 };

    if (compile.exitCode !== 0) {
      const errMsg = compile.stderr || compile.stdout || 'Compilation failed';
      return { compile_error: errMsg, results: [], waveform_vcd: null, runtime_ms: 0, passed: 0, total: 0 };
    }

    const sim = await spawnTimeout(VVP, [outFile], {}, timeLimitMs);

    if (sim.timedOut)
      return { compile_error: null, results: [], waveform_vcd: null, runtime_ms: timeLimitMs, passed: 0, total: 0, timeout: true };

    // Parse PASS:/FAIL: lines
    const lines   = (sim.stdout + '\n' + sim.stderr).split('\n').map(l => l.trim()).filter(Boolean);
    const results = [];
    let passed = 0;

    for (const line of lines) {
      if (line.startsWith('PASS:')) {
        const name   = line.slice(5).trim();
        const parsed = parseTestLine(name);
        results.push({ name, passed: true, stdin: parsed.input, expected: parsed.expected, got: parsed.expected });
        passed++;
      } else if (line.startsWith('FAIL:')) {
        const name   = line.slice(5).trim();
        const parsed = parseTestLine(name);
        results.push({ name, passed: false, stdin: parsed.input, expected: parsed.expected, got: parsed.got });
      }
    }

    // Read VCD waveform (cap at MAX_VCD_BYTES)
    let waveform_vcd = null;
    if (fs.existsSync(vcdFile)) {
      const vcdContent = fs.readFileSync(vcdFile, 'utf8');
      if (Buffer.byteLength(vcdContent, 'utf8') < MAX_VCD_BYTES)
        waveform_vcd = vcdContent;
      else
        waveform_vcd = vcdContent.slice(0, MAX_VCD_BYTES); // truncate but keep header
    }

    const runId = makeRunId(studentCode, testbench);

    return {
      run_id: runId,
      compile_error: null,
      results,
      waveform_vcd,
      runtime_ms: sim.runtimeMs,
      passed,
      total: results.length,
      stdout: sim.stdout,
      stderr: sim.stderr,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up Verilog sandbox temporary directory', error);
    }
  }
}

async function checkIverilog() {
  try {
    const r = await spawnTimeout(IVERILOG, ['-V'], {}, 3000);
    return r.exitCode === 0 || (r.stderr || '').includes('Icarus') || (r.stdout || '').includes('Icarus');
  } catch {
    return false;
  }
}

module.exports = { runVerilog, checkIverilog, makeRunId };
