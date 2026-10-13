'use strict';

const { TestAttempt, syncDB } = require('../models');
const {
  normalizeDeviceFingerprint,
  sessionDeviceMatches,
  isUserSessionEligible,
  hasLabAccess,
  requireLabAccess,
} = require('../middleware/auth');
const { isPlaceholderValue } = require('../config/envValidation');
const { buildDatabaseConfig } = require('../config/sequelize-cli');
const { getExecutionMode, validateProductionExecutionConfig, assertHostExecutionAllowed } = require('../utils/executionPolicy');
const { runVerilog } = require('../utils/verilogSandbox');
const { parseJwtLifetime } = require('../utils/jwtLifetime');

describe('security hardening checks', () => {
  test('exports the TestAttempt model used by coding flows', () => {
    expect(TestAttempt).toBeDefined();
    expect(typeof TestAttempt.findOne).toBe('function');
  });

  test('database auto-sync stays disabled unless explicitly enabled', async () => {
    const result = await syncDB();
    expect(result).toMatchObject({ skipped: true });
  });

  test('database sync cannot be enabled in deployment environments', async () => {
    const priorNodeEnv = process.env.NODE_ENV;
    const priorAllowSync = process.env.ALLOW_DB_SYNC;
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DB_SYNC = 'true';
    try {
      await expect(syncDB()).rejects.toThrow(/disabled in deployment environments/);
    } finally {
      process.env.NODE_ENV = priorNodeEnv;
      if (priorAllowSync === undefined) delete process.env.ALLOW_DB_SYNC;
      else process.env.ALLOW_DB_SYNC = priorAllowSync;
    }
  });

  test('device fingerprints are normalized and checked against stored sessions', () => {
    expect(normalizeDeviceFingerprint('  device-123  ')).toBe('device-123');
    expect(normalizeDeviceFingerprint('   ')).toBeNull();
    expect(normalizeDeviceFingerprint('x'.repeat(400))).toBeNull();

    expect(sessionDeviceMatches({ device_fingerprint: 'device-123' }, { headers: { 'x-device-fingerprint': 'device-123' } })).toBe(true);
    expect(sessionDeviceMatches({ device_fingerprint: 'device-123' }, { headers: { 'x-device-fingerprint': 'device-999' } })).toBe(false);
    expect(sessionDeviceMatches({ device_fingerprint: 'device-123' }, { headers: {} })).toBe(false);
  });

  test('session authorization follows current account status and flagged state', () => {
    expect(isUserSessionEligible({ status: 'active', is_flagged: false })).toBe(true);
    expect(isUserSessionEligible({ status: 'suspended', is_flagged: false })).toBe(false);
    expect(isUserSessionEligible({ status: 'active', is_flagged: true })).toBe(false);
    expect(isUserSessionEligible(null)).toBe(false);
  });

  test('lab permission is enforced for students while super admins retain access', () => {
    expect(hasLabAccess({ role: 'student', can_use_lab: true })).toBe(true);
    expect(hasLabAccess({ role: 'student', can_use_lab: false })).toBe(false);
    expect(hasLabAccess({ role: 'student', can_use_lab: 1 })).toBe(false);
    expect(hasLabAccess({ role: 'super_admin', can_use_lab: false })).toBe(true);
    expect(hasLabAccess(null)).toBe(false);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    requireLabAccess({ user: { role: 'student', can_use_lab: false } }, response, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Lab access is not enabled for this account',
      code: 'LAB_ACCESS_REQUIRED',
    });
    expect(next).not.toHaveBeenCalled();

    requireLabAccess({ user: { role: 'super_admin', can_use_lab: false } }, response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('JWT expiry durations parse to the same lifetime used for session expiry', () => {
    expect(parseJwtLifetime('30m')).toEqual({ expiresIn: '30m', seconds: 1800 });
    expect(parseJwtLifetime('86400')).toEqual({ expiresIn: 86400, seconds: 86400 });
    expect(() => parseJwtLifetime('0d')).toThrow(/JWT_EXPIRES_IN/);
    expect(() => parseJwtLifetime('one-week')).toThrow(/JWT_EXPIRES_IN/);
  });

  test('placeholder credentials are rejected by the config guard', () => {
    expect(isPlaceholderValue('replace_with_strong_local_password')).toBe(true);
    expect(isPlaceholderValue('replace_with_32_plus_character_secret')).toBe(true);
    expect(isPlaceholderValue('MySecurePassword!2025')).toBe(false);
  });

  test('migration config requires explicit non-placeholder credentials and a valid port', () => {
    expect(() => buildDatabaseConfig({
      DB_NAME: 'app_db',
      DB_USER: 'app_user',
      DB_PASS: 'replace_with_password',
    })).toThrow(/placeholder\/default/);

    expect(() => buildDatabaseConfig({
      DB_NAME: 'app_db',
      DB_USER: 'app_user',
      DB_PASS: 'secure-value',
      DB_PORT: 'not-a-port',
    })).toThrow(/DB_PORT/);
    expect(() => buildDatabaseConfig({
      NODE_ENV: 'production',
      DB_NAME: 'app_db',
      DB_USER: 'root',
      DB_PASS: 'secure-value',
    })).toThrow(/least-privilege/);

    expect(buildDatabaseConfig({
      DB_NAME: 'app_db',
      DB_USER: 'app_user',
      DB_PASS: 'secure-value',
      DB_PORT: '3307',
    })).toMatchObject({
      database: 'app_db',
      username: 'app_user',
      password: 'secure-value',
      host: '127.0.0.1',
      port: 3307,
      dialect: 'mysql',
    });
  });

  test('production execution requires a configured isolated service over HTTPS', () => {
    expect(getExecutionMode({})).toBe('judge0');
    expect(() => validateProductionExecutionConfig({ NODE_ENV: 'production', SANDBOX_MODE: 'process' }))
      .toThrow(/SANDBOX_MODE=judge0/);
    expect(() => validateProductionExecutionConfig({ NODE_ENV: 'production', SANDBOX_MODE: 'judge0' }))
      .toThrow(/JUDGE0_URL/);
    expect(() => validateProductionExecutionConfig({
      NODE_ENV: 'staging',
      SANDBOX_MODE: 'process',
      JUDGE0_URL: 'https://judge.example.net',
    })).toThrow(/SANDBOX_MODE=judge0/);
    expect(() => validateProductionExecutionConfig({
      NODE_ENV: 'production',
      SANDBOX_MODE: 'judge0',
      JUDGE0_URL: 'http://judge0.internal',
    })).toThrow(/HTTPS/);
    expect(() => validateProductionExecutionConfig({
      NODE_ENV: 'production',
      SANDBOX_MODE: 'judge0',
      JUDGE0_URL: 'https://judge0.example.com',
    })).toThrow(/placeholder/);
    expect(() => validateProductionExecutionConfig({
      NODE_ENV: 'production',
      SANDBOX_MODE: 'judge0',
      JUDGE0_URL: 'https://judge0.internal.example.net',
    })).not.toThrow();
  });

  test('host execution is forbidden in production and requires explicit local process mode', () => {
    expect(() => assertHostExecutionAllowed({ NODE_ENV: 'production', SANDBOX_MODE: 'process' }))
      .toThrow(/disabled in deployments/);
    expect(() => assertHostExecutionAllowed({ NODE_ENV: 'staging', SANDBOX_MODE: 'process' }))
      .toThrow(/disabled in deployments/);
    expect(() => assertHostExecutionAllowed({ NODE_ENV: 'test', SANDBOX_MODE: 'judge0' }))
      .toThrow(/explicit SANDBOX_MODE=process/);
    expect(() => assertHostExecutionAllowed({ NODE_ENV: 'test', SANDBOX_MODE: 'process' })).not.toThrow();
  });

  test('HDL runner fails closed without invoking host tools in production', async () => {
    const priorNodeEnv = process.env.NODE_ENV;
    const priorSandboxMode = process.env.SANDBOX_MODE;
    process.env.NODE_ENV = 'production';
    process.env.SANDBOX_MODE = 'judge0';
    try {
      await expect(runVerilog('module top; endmodule', 'module tb; endmodule')).resolves.toMatchObject({
        execution_unavailable: true,
        waveform_vcd: null,
        results: [],
      });
    } finally {
      process.env.NODE_ENV = priorNodeEnv;
      if (priorSandboxMode === undefined) delete process.env.SANDBOX_MODE;
      else process.env.SANDBOX_MODE = priorSandboxMode;
    }
  });
});
