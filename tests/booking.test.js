import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDB } from './test-helper.js';
import { createApp } from '../server/app.js';

test('public booking persists privately; same-date requests allowed', async () => {
  const { cleanup, mysqlOptions } = await createTestDB();
  const { app, db } = await createApp(mysqlOptions);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const payload = { name: 'Test Client', phone: '081234567890', package: 'makeup', date: '2028-12-20', location: 'Jakarta', makeupPeople: 2, consent: true };
    for (let i = 0; i < 2; i++) {
      const res = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      assert.equal(res.status, 201);
      assert.ok((await res.json()).reference);
    }
    const count = await db.prepare('SELECT COUNT(*) AS n FROM bookings').get();
    assert.equal(count.n, 2);
    assert.equal((await fetch(base + '/api/bookings')).status, 401);
    const bad = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, makeupPeople: 0 }) });
    assert.equal(bad.status, 400);
  } finally {
    await new Promise(r => server.close(r));
    await db.close();
    await cleanup();
  }
});
