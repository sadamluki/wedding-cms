import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('server fails with useful error when MySQL is unreachable', () => {
  const result = spawnSync(process.execPath, ['server/start.js'], {
    env: { ...process.env, DB_HOST: '127.0.0.1', DB_PORT: '39999', DB_USER: 'nobody', DB_PASSWORD: 'wrong', DB_NAME: 'nonexistent', PORT: '0' },
    timeout: 10000,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Database initialization failed|ECONNREFUSED/);
});
