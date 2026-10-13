'use strict';

function publicErrorMessage(message, fallback = 'Submission failed. Please review the public result details.') {
  if (!message) return null;
  const text = String(message).replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (/time limit|timed out|timeout/i.test(text)) {
    return 'Timed out during execution.';
  }

  if (/compile|syntax|runtime|exception|undefined|reference|assertion/i.test(text)) {
    return 'Compilation or runtime error. Please review your code and try again.';
  }

  return fallback;
}

function sanitizeResultEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;

  const safe = { ...entry };
  const hidden = Boolean(safe.is_hidden || safe.hidden);

  if (safe.waveform_vcd) safe.waveform_vcd = null;
  if (safe.hidden_passed !== undefined) safe.hidden_passed = null;
  if (safe.hidden_total !== undefined) safe.hidden_total = null;
  if (safe.scoring_basis !== undefined) safe.scoring_basis = 'public';

  if (hidden) {
    [
      'input',
      'stdin',
      'input_data',
      'expected',
      'expected_output',
      'expected_value',
      'expected_data',
      'actual',
      'actual_output',
      'actual_value',
      'actual_data',
      'got',
      'output',
    ].forEach((key) => {
      if (key in safe) safe[key] = null;
    });
    safe.name = 'Hidden Test';
    if ('passed' in safe) safe.passed = null;
  }

  for (const key of ['error', 'error_message', 'stderr', 'compile_error']) {
    if (safe[key]) {
      safe[key] = hidden ? 'Hidden test failed.' : publicErrorMessage(safe[key]);
    }
  }

  return safe;
}

function publicizeResultPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const safe = { ...payload };
  safe.waveform_vcd = null;
  safe.hidden_passed = null;
  safe.hidden_total = null;
  safe.compile_error = safe.compile_error ? publicErrorMessage(safe.compile_error) : null;
  safe.results = Array.isArray(safe.results) ? safe.results.map(sanitizeResultEntry) : safe.results;

  if (Array.isArray(safe.results) && safe.results.some((result) => result?.is_hidden || result?.hidden)) {
    const visibleResults = safe.results.filter((result) => result && !result.is_hidden && !result.hidden);
    const visiblePassed = visibleResults.filter((result) => result.passed === true).length;
    for (const key of ['passed', 'test_cases_passed', 'passed_cases']) {
      if (key in safe) safe[key] = visiblePassed;
    }
    for (const key of ['total', 'test_cases_total', 'total_cases']) {
      if (key in safe) safe[key] = visibleResults.length;
    }
  }

  return safe;
}

module.exports = {
  publicErrorMessage,
  sanitizeResultEntry,
  publicizeResultPayload,
};
