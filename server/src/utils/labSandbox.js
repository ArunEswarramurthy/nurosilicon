'use strict';

const { execute } = require('./sandbox');
const { runVerilog, checkIverilog } = require('./verilogSandbox');
const { Language } = require('../models');

const HDL_LANGS = ['verilog', 'vhdl', 'systemverilog'];

// Run lab code against a problem's test cases
async function runLabCode(langName, sourceCode, problem, timeLimitMs = 10000, mode = 'run', customCases = null) {
  // HDL — use verilog sandbox
  if (HDL_LANGS.includes(langName)) {
    const langType = langName === 'systemverilog' ? 'waveform_analysis' : 'rtl_coding';
    return runVerilog(sourceCode, problem.testbench, timeLimitMs, langType);
  }

  // Programming language — use sandbox.js
  const lang = await Language.findOne({ where: { name: langName } });
  if (!lang) return { compile_error: `Language '${langName}' not configured`, results: [], passed: 0, total: 0 };

  // Pick test cases
  let cases;
  if (customCases?.length) {
    cases = customCases.map(c => ({ stdin: c.stdin || '', expected_output: c.expected_output || '', is_hidden: false }));
  } else if (mode === 'run') {
    cases = (problem.test_cases || []).map(c => ({ ...c, is_hidden: false }));
  } else {
    const visible = (problem.test_cases || []).map(c => ({ ...c, is_hidden: false }));
    const hidden  = (problem.hidden_test_cases || []).map(c => ({ ...c, is_hidden: true }));
    cases = [...visible, ...hidden];
  }

  if (!cases.length) return { compile_error: null, results: [], passed: 0, total: 0, stdout: '' };

  const results = [];
  let passed = 0;
  let compileError = null;
  let totalRuntime = 0;

  for (const tc of cases) {
    let result;
    try {
      result = await execute(lang, sourceCode, tc.stdin || '');
    } catch (e) {
      result = { stdout: '', stderr: e.message, runtimeMs: 0, timedOut: false, compileError: e.message };
    }

    if (result.compileError && !compileError) compileError = result.compileError;

    const norm = v => String(v || '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const tcPassed = !result.timedOut && !result.compileError && norm(result.stdout) === norm(tc.expected_output);
    if (tcPassed) passed++;
    totalRuntime += result.runtimeMs || 0;

    results.push({
      name: tc.is_hidden ? 'Hidden Test' : `Case`,
      passed: tcPassed,
      hidden: !!tc.is_hidden,
      stdin: tc.is_hidden ? null : tc.stdin,
      expected: tc.is_hidden ? null : tc.expected_output,
      got: tc.is_hidden ? null : norm(result.stdout),
      error: result.timedOut ? 'Time limit exceeded' : (result.stderr || result.compileError || null),
    });

    if (compileError) break; // no point running more if compile failed
  }

  return {
    compile_error: compileError,
    results,
    passed,
    total: cases.length,
    runtime_ms: totalRuntime,
    stdout: results[0]?.got || '',
    waveform_vcd: null,
  };
}

// Free code run (no problem, just execute)
async function runFreeCode(langName, sourceCode, stdin = '', timeLimitMs = 15000) {
  if (HDL_LANGS.includes(langName)) return { compile_error: 'Free run not supported for HDL', stdout: '', runtime_ms: 0 };
  const lang = await Language.findOne({ where: { name: langName } });
  if (!lang) return { compile_error: `Language '${langName}' not configured`, stdout: '', runtime_ms: 0 };
  try {
    const result = await execute(lang, sourceCode, stdin);
    return {
      compile_error: result.compileError || null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      runtime_ms: result.runtimeMs || 0,
    };
  } catch (e) {
    return { compile_error: e.message, stdout: '', runtime_ms: 0 };
  }
}

// ── Probe a single executable ────────────────────────────────────────────────
const fs = require('fs');
const { spawnSync } = require('child_process');
const AVR_GCC = (() => {
  const p = 'C:\\Users\\Arun E\\Downloads\\avr8-gnu-toolchain-4.0.0.52-win32.any.x86_64\\avr8-gnu-toolchain-win32_x86_64\\bin\\avr-gcc.exe';
  return fs.existsSync(p) ? p : 'avr-gcc';
})();

function probeExe(cmd, args = ['--version']) {
  try {
    const r = spawnSync(cmd, args, { timeout: 3000, encoding: 'utf8' });
    return r.status === 0 || (r.stdout + r.stderr).length > 0;
  } catch { return false; }
}

// Health check
async function checkCompilers() {
  const iverilog = await checkIverilog();
  return {
    iverilog,
    gcc:     probeExe('gcc'),
    gpp:     probeExe('g++'),
    python3: probeExe('python3') || probeExe('python', ['--version']),
    java:    probeExe('java', ['-version']),
    avr_gcc: probeExe(AVR_GCC),
    mysql:   probeExe('mysql', ['--version']),
  };
}

module.exports = { runLabCode, runFreeCode, checkCompilers };
