'use strict';

const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };

const parseJwtLifetime = (value = '7d') => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return { expiresIn: value, seconds: value };
  }

  if (typeof value !== 'string') {
    throw new Error('JWT_EXPIRES_IN must be positive seconds or a duration such as 15m, 1h, or 7d.');
  }

  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized);
    if (Number.isSafeInteger(seconds) && seconds > 0) return { expiresIn: seconds, seconds };
  }

  const match = normalized.match(/^([1-9]\d*)(s|m|h|d)$/i);
  if (match) {
    const seconds = Number(match[1]) * UNIT_SECONDS[match[2].toLowerCase()];
    if (Number.isSafeInteger(seconds)) return { expiresIn: normalized, seconds };
  }

  throw new Error('JWT_EXPIRES_IN must be positive seconds or a duration such as 15m, 1h, or 7d.');
};

const getConfiguredJwtLifetime = (env = process.env) =>
  parseJwtLifetime(env.JWT_EXPIRES_IN || '7d');

module.exports = { parseJwtLifetime, getConfiguredJwtLifetime };
