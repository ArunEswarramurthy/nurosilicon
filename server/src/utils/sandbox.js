'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { getExecutionMode, assertHostExecutionAllowed } = require('./executionPolicy');

// Allowed language identifiers for process-mode execution
const ALLOWED_EXECUTABLES = new Set(['node', 'python3', 'python', 'java', 'javac', 'gcc', 'g++', 'dotnet', 'ruby', 'go']);

function validateExecutable(exe) {
  const base = path.basename(exe).toLowerCase();
  if (base === 'solution' || base === 'solution.exe') return;
  if (!ALLOWED_EXECUTABLES.has(base)) {
    throw new Error(`Disallowed executable: ${base}`);
  }
}

// ── Judge0 runner (used when SANDBOX_MODE=judge0) ─────────────────────────────

async function runViaJudge0(language, sourceCode, stdin, timeLimitMs, memoryLimitMb) {
  if (!process.env.JUDGE0_URL) {
    throw new Error('Isolated execution service is not configured: JUDGE0_URL is required.');
  }
  if (!Number.isInteger(language.judge_language_id) || language.judge_language_id < 1) {
    throw new Error(`Language '${language.name}' has no valid Judge0 language ID configured.`);
  }
  if (!Number.isFinite(timeLimitMs) || timeLimitMs <= 0 || !Number.isFinite(memoryLimitMb) || memoryLimitMb <= 0) {
    throw new Error('Language execution limits must be positive finite values.');
  }

  const base = process.env.JUDGE0_URL.replace(/\/+$/, '');
  const headers = process.env.JUDGE0_API_KEY
    ? { 'X-Auth-Token': process.env.JUDGE0_API_KEY }
    : {};

  const { data: token } = await axios.post(
    `${base}/submissions?base64_encoded=false&wait=true`,
    {
      language_id: language.judge_language_id,
      source_code: sourceCode,
      stdin: stdin || '',
      cpu_time_limit: timeLimitMs / 1000,
      memory_limit: memoryLimitMb * 1024,
    },
    {
      headers,
      timeout: timeLimitMs + 5000,
      maxContentLength: 512 * 1024,
      maxBodyLength: 512 * 1024,
    },
  );

  const status = token.status?.description || 'Unknown';
  const stdout = (token.stdout || '').trim();
  const stderr = (token.stderr || token.compile_output || '').trim();
  const runtimeMs = Math.round((parseFloat(token.time) || 0) * 1000);
  const memoryKb = token.memory || 0;

  if (status === 'Accepted') return { passed: true, stdout, stderr, runtimeMs, memoryKb, timedOut: false, compileError: null };
  if (status.includes('Time Limit')) return { passed: false, stdout: '', stderr: '', runtimeMs: timeLimitMs, memoryKb, timedOut: true, compileError: null };
  if (status.includes('Compilation')) return { passed: false, stdout: '', stderr, runtimeMs: 0, memoryKb: 0, timedOut: false, compileError: stderr };
  return { passed: false, stdout, stderr, runtimeMs, memoryKb, timedOut: false, compileError: null };
}

// ── Local process runner (explicit development/test use only) ─────────────────
// Writes source to a temp file, optionally compiles, then runs with timeout.
// No eval(), no require() of user code — always a separate OS process.

function spawnWithTimeout(cmd, args, opts, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    if (opts.input) proc.stdin.write(opts.input);
    proc.stdin.end();

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code,
        runtimeMs: Date.now() - start,
        timedOut: killed,
      });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: -1, runtimeMs: Date.now() - start, timedOut: false });
    });
  });
}

function splitCommand(command) {
  const parts = [];
  let current = '';
  let quote = null;

  for (const ch of command) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) parts.push(current);
  return parts;
}

function interpolate(cmd, srcFile, tmpDir) {
  const outputFile = path.join(tmpDir, process.platform === 'win32' ? 'solution.exe' : 'solution');
  return cmd
    .replace(/\{\{file\}\}/g, `"${srcFile}"`)
    .replace(/\{\{dir\}\}\/solution/g, `"${outputFile}"`)
    .replace(/\{\{dir\}\}/g, `"${tmpDir}"`);
}

async function runViaProcess(language, sourceCode, stdin, timeLimitMs) {
  assertHostExecutionAllowed();

  // Guard against oversized source code
  if (Buffer.byteLength(sourceCode, 'utf8') > 256 * 1024) {
    return { stdout: '', stderr: 'Source code too large (max 256 KB)', runtimeMs: 0, memoryKb: 0, timedOut: false, compileError: 'Source code too large' };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-'));
  const srcFile = path.join(tmpDir, `solution${language.file_extension}`);
  fs.writeFileSync(srcFile, sourceCode, 'utf8');

  try {
    // Compile step (optional)
    if (language.compile_cmd) {
      const [compileExe, ...compileArgs] = splitCommand(interpolate(language.compile_cmd, srcFile, tmpDir));
      validateExecutable(compileExe);
      const compileResult = await spawnWithTimeout(compileExe, compileArgs, {}, 15000);
      if (compileResult.exitCode !== 0) {
        return {
          stdout: '', stderr: compileResult.stderr,
          runtimeMs: 0, memoryKb: 0,
          timedOut: false, compileError: compileResult.stderr,
        };
      }
    }

    // Run step
    const [runExe, ...runArgs] = splitCommand(interpolate(language.run_cmd, srcFile, tmpDir));
    validateExecutable(runExe);
    const result = await spawnWithTimeout(runExe, runArgs, { input: stdin || '' }, timeLimitMs);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      runtimeMs: result.runtimeMs,
      memoryKb: 0,   // process runner doesn't measure memory
      timedOut: result.timedOut,
      compileError: null,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── SystemVerilog testbench runner (for waveform_analysis questions) ──────────
const { spawn: _spawn } = require('child_process');
const _fs   = require('fs');
const _os   = require('os');
const _path = require('path');

function _resolveIverilog() {
  const candidates = [
    'C:\\iverilog\\bin\\iverilog.exe',
    'C:\\Program Files\\iverilog\\bin\\iverilog.exe',
  ];
  for (const c of candidates) if (_fs.existsSync(c)) return c;
  return 'iverilog';
}
function _resolveVvp() {
  const candidates = [
    'C:\\iverilog\\bin\\vvp.exe',
    'C:\\Program Files\\iverilog\\bin\\vvp.exe',
  ];
  for (const c of candidates) if (_fs.existsSync(c)) return c;
  return 'vvp';
}

function _spawnWait(cmd, args, opts, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc  = _spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', killed = false;
    const timer = setTimeout(() => { killed = true; proc.kill('SIGKILL'); }, timeoutMs);
    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.stdin.end();
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code, runtimeMs: Date.now() - start, timedOut: killed });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: -1, runtimeMs: Date.now() - start, timedOut: false, notFound: err.code === 'ENOENT' });
    });
  });
}

/**
 * Run a waveform_analysis question using iverilog + testbench.
 * Returns { passed, total, results, compile_error, runtime_ms }
 * results = [{ name, passed }]
 */
async function executeHDL(studentCode, testbench, timeLimitMs = 10000) {
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

  const tmpDir = _fs.mkdtempSync(_path.join(_os.tmpdir(), 'cf-sv-'));
  try {
    const sFile   = _path.join(tmpDir, 'solution.sv');
    const tbFile  = _path.join(tmpDir, 'testbench.sv');
    const outFile = _path.join(tmpDir, 'sim.out');
    const vcdFile = _path.join(tmpDir, 'dump.vcd');
    const vcdFwd  = vcdFile.replace(/\\/g, '/');

    // Fix $dumpfile path to absolute
    let tb = testbench || '';
    if (tb.includes('$dumpfile')) {
      tb = tb.replace(/\$dumpfile\s*\(\s*["'].*?["']\s*\)/g, `$dumpfile("${vcdFwd}")`);
    }

    _fs.writeFileSync(sFile,  studentCode, 'utf8');
    _fs.writeFileSync(tbFile, tb,          'utf8');

    const iverilog = _resolveIverilog();
    const vvp      = _resolveVvp();

    const compile = await _spawnWait(iverilog, ['-g2012', '-o', outFile, tbFile, sFile], {}, 15000);
    if (compile.notFound) {
      return { compile_error: 'iverilog not installed on server', results: [], passed: 0, total: 0, runtime_ms: 0 };
    }
    if (compile.exitCode !== 0) {
      return { compile_error: compile.stderr || 'Compilation failed', results: [], passed: 0, total: 0, runtime_ms: 0 };
    }

    const sim = await _spawnWait(vvp, [outFile], {}, timeLimitMs);
    if (sim.timedOut) {
      return { compile_error: null, results: [], passed: 0, total: 0, runtime_ms: timeLimitMs, timedOut: true };
    }

    const lines   = sim.stdout.split('\n').filter(Boolean);
    const results = [];
    let passed = 0;
    for (const line of lines) {
      if (line.startsWith('PASS:')) { results.push({ name: line.replace('PASS:', '').trim(), passed: true });  passed++; }
      else if (line.startsWith('FAIL:')) { results.push({ name: line.replace('FAIL:', '').trim(), passed: false }); }
    }

    let waveform_vcd = null;
    if (_fs.existsSync(vcdFile)) {
      const vcd = _fs.readFileSync(vcdFile, 'utf8');
      if (Buffer.byteLength(vcd, 'utf8') < 200 * 1024) waveform_vcd = vcd;
    }

    return { compile_error: null, results, passed, total: results.length, runtime_ms: sim.runtimeMs, waveform_vcd };
  } finally {
    _fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute source code against a single stdin input.
 * Returns { stdout, stderr, runtimeMs, memoryKb, timedOut, compileError }
 */
async function execute(language, sourceCode, stdin) {
  const mode = getExecutionMode();
  if (mode === 'judge0') {
    return runViaJudge0(language, sourceCode, stdin, language.time_limit_ms, language.memory_limit_mb);
  }
  if (mode === 'process') {
    return runViaProcess(language, sourceCode, stdin, language.time_limit_ms);
  }
  throw new Error(`Unsupported SANDBOX_MODE '${mode}'. Use judge0, or process only outside production.`);
}

module.exports = { execute, executeHDL };
