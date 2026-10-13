'use strict';

const { publicizeResultPayload } = require('../utils/publicResult');

describe('public result contract', () => {
  test('redacts waveform and hidden-case details from student-facing payloads', () => {
    const payload = publicizeResultPayload({
      submission_id: 'abc',
      status: 'failed',
      compile_error: 'Undefined variable foo at line 7',
      waveform_vcd: '$dumpvars\n...secret waveform...',
      results: [
        { name: 'case-1', passed: false, is_hidden: true, input: '1 2', expected_output: '3', actual_output: '4', error_message: 'Assertion failed: hidden value mismatch' },
        { name: 'public-case', passed: false, is_hidden: false, input: '1', expected_output: '2', actual_output: '3', error_message: 'Wrong answer' },
      ],
    });

    expect(payload.waveform_vcd).toBeNull();
    expect(payload.compile_error).not.toMatch(/Undefined variable|line 7/i);
    expect(payload.results[0].input).toBeNull();
    expect(payload.results[0].actual_output).toBeNull();
    expect(payload.results[0].error_message).toMatch(/Hidden test failed|Compilation or runtime error/i);
    expect(payload.results[1].error_message).toBeTruthy();
    expect(payload.results[1].error_message).not.toMatch(/Wrong answer/i);
  });

  test('keeps public aggregate fields while stripping confidential grading metadata', () => {
    const payload = publicizeResultPayload({
      status: 'passed',
      score: 10,
      test_cases_passed: 2,
      test_cases_total: 2,
      hidden_passed: 2,
      hidden_total: 2,
      waveform_vcd: 'secret',
      results: [{ passed: true, name: 'Public check' }],
    });

    expect(payload.waveform_vcd).toBeNull();
    expect(payload.hidden_passed).toBeNull();
    expect(payload.hidden_total).toBeNull();
    expect(payload.test_cases_passed).toBe(2);
    expect(payload.results[0].name).toBe('Public check');
  });

  test('redacts lab result aliases and hidden aggregate counts', () => {
    const payload = publicizeResultPayload({
      passed: 2,
      total: 3,
      test_cases_passed: 2,
      test_cases_total: 3,
      results: [
        { hidden: false, passed: true, stdin: '1', expected: '2', got: '2' },
        { hidden: true, passed: false, stdin: 'secret input', expected: 'secret expected', got: 'secret output', error: 'secret runner output' },
      ],
    });

    expect(payload.passed).toBe(1);
    expect(payload.total).toBe(1);
    expect(payload.test_cases_passed).toBe(1);
    expect(payload.test_cases_total).toBe(1);
    expect(payload.results[1]).toMatchObject({
      name: 'Hidden Test',
      passed: null,
      stdin: null,
      expected: null,
      got: null,
      error: 'Hidden test failed.',
    });
  });

  test('sanitizes hidden compiler and runtime diagnostics', () => {
    const payload = publicizeResultPayload({
      results: [{
        is_hidden: true,
        passed: false,
        stderr: 'C:\\private\\worker\\secret.c:42: assertion failed',
        compile_error: 'compiler found secret source path',
      }],
    });

    expect(payload.results[0].stderr).toBe('Hidden test failed.');
    expect(payload.results[0].compile_error).toBe('Hidden test failed.');
  });
});
