'use strict';

const { isPlaceholderValue } = require('../config/envValidation');

const getExecutionMode = (env = process.env) => env.SANDBOX_MODE || 'judge0';
const isDeploymentEnvironment = (env = process.env) =>
  env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';

const validateProductionExecutionConfig = (env = process.env) => {
  if (!isDeploymentEnvironment(env)) return;

  const mode = getExecutionMode(env);
  if (mode !== 'judge0') {
    throw new Error('Deployment execution requires SANDBOX_MODE=judge0; host-process execution is not allowed.');
  }

  if (!env.JUDGE0_URL) {
    throw new Error('Deployment execution requires JUDGE0_URL for the isolated Judge0 service.');
  }

  let judgeUrl;
  try {
    judgeUrl = new URL(env.JUDGE0_URL);
  } catch {
    throw new Error('JUDGE0_URL must be a valid absolute HTTP(S) URL.');
  }

  if (judgeUrl.protocol !== 'https:' || judgeUrl.username || judgeUrl.password) {
    throw new Error('Deployment JUDGE0_URL must use HTTPS and must not include embedded credentials.');
  }
  if (isPlaceholderValue(env.JUDGE0_URL)) {
    throw new Error('Deployment JUDGE0_URL must be an explicit service URL, not a placeholder.');
  }
};

const assertHostExecutionAllowed = (env = process.env) => {
  if (isDeploymentEnvironment(env)) {
    throw new Error('Host-process execution is disabled in deployments; configure an isolated execution service.');
  }
  if (getExecutionMode(env) !== 'process') {
    throw new Error('Host-process execution requires explicit SANDBOX_MODE=process outside production.');
  }
};

module.exports = {
  getExecutionMode,
  isDeploymentEnvironment,
  validateProductionExecutionConfig,
  assertHostExecutionAllowed,
};
