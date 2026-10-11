import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDB } from './test-helper.js';
import { createApp } from '../server/app.js';

test('public and protected admin creation require phone and optional theme', async () => {
  const { cleanup, mysqlOptions } = await createTestDB();
  const { app, db } = await createApp(mysqlOptions);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const data = { name: 'Client', phone: '081234567890', package: 'dekor', date: '2028-12-20', location: 'Jakarta', consent: true };
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('/api/bookings', { ...data, phone: undefined })).status, 400, 'phone is now required');
    assert.equal((await post('/api/bookings', { ...data, phone: '' })).status, 400, 'empty phone rejected');
    for (const phone of ['abc', '123', 123, null]) assert.equal((await post('/api/bookings', { ...data, phone })).status, 400);
    assert.equal((await post('/api/bookings', data)).status, 201, 'dekor without theme is accepted (theme now optional)');
    assert.equal((await post('/api/bookings', { ...data, theme: 'Garden' })).status, 201);
    assert.equal((await post('/api/bookings', { ...data, theme: { bad: true } })).status, 400);
    assert.equal((await post('/api/admin/bookings', data)).status, 401);
    const credentials = { username: 'testowner', password: 'Only-test-password-123!' };
    await post('/api/setup', credentials);
    const login = await post('/api/login', credentials);
    const Cookie = login.headers.get('set-cookie').split(';')[0];
    const { csrf } = await login.json();
    assert.equal((await post('/api/admin/bookings', data, { Cookie })).status, 403);
    assert.equal((await post('/api/admin/bookings', data, { Cookie, 'X-CSRF-Token': csrf, Origin: 'https://evil.example' })).status, 403);
    const result = await post('/api/admin/bookings', { ...data, consent: undefined }, { Cookie, 'X-CSRF-Token': csrf });
    assert.equal(result.status, 201, 'admin does not need public consent checkbox');
    const { reference } = await result.json();
    const row = await db.prepare('SELECT data FROM bookings WHERE id=?').get(reference);
    const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    assert.equal(parsed.phone, data.phone);
    assert.ok(!('instagram' in parsed) && !('facebook' in parsed) && !('tiktok' in parsed), 'social fields no longer stored');
  } finally {
    await new Promise(r => server.close(r));
    await db.close();
    await cleanup();
  }
});
