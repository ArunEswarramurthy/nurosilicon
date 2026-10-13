'use strict';
// Jest setup — extend timeout for simulation tests
jest.setTimeout(30000);

if (process.env.NODE_ENV === 'test' && !process.env.SANDBOX_MODE) {
  process.env.SANDBOX_MODE = 'process';
}
