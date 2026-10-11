import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDB } from './test-helper.js';
import { createApp } from '../server/app.js';

test('soft-delete, restore, edit identity, and pagination', async () => {
  const { cleanup, mysqlOptions } = await createTestDB();
  const { app, db } = await createApp(mysqlOptions);
  const s = app.listen(0, '127.0.0.1');
  await new Promise(r => s.once('listening', r));
  const base = `http://127.0.0.1:${s.address().port}`;
  let cookie = '';
  const call = (path, body, method = 'POST', extra = {}) => fetch(base + path, {
    method: body !== undefined ? method : 'GET',
    headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie, ...extra },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  try {
    // Setup admin
    const credentials = { username: 'admin', password: 'Test-delete-password-123!' };
    await call('/api/setup', credentials);
    const login = await call('/api/login', credentials);
    cookie = login.headers.get('set-cookie').split(';')[0];
    const { csrf } = await login.json();
    const headers = { Cookie: cookie, 'X-CSRF-Token': csrf };

    // Create bookings
    for (let i = 0; i < 3; i++) {
      await fetch(base + '/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Client ' + i, phone: '081234567890', package: 'makeup', date: '2028-12-20', location: 'Jakarta', makeupPeople: 1, consent: true }) });
    }

    // Pagination
    let list = await (await call('/api/bookings?page=1&limit=2')).json();
    assert.equal(list.bookings.length, 2);
    assert.equal(list.pagination.total, 3);
    assert.equal(list.pagination.pages, 2);

    const id = list.bookings[0].id;

    // Edit identity
    const editRes = await fetch(base + '/api/bookings/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: base, ...headers },
      body: JSON.stringify({ name: 'Updated Name', phone: '089876543210', package: 'dekor', date: '2028-12-25', location: 'Bandung', theme: 'Rustic' }),
    });
    assert.equal(editRes.status, 200);

    // Verify edit
    list = await (await call('/api/bookings?page=1&limit=10')).json();
    const edited = list.bookings.find(b => b.id === id);
    assert.equal(edited.name, 'Updated Name');
    assert.equal(edited.location, 'Bandung');

    // Soft delete
    const delRes = await fetch(base + '/api/bookings/' + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Origin: base, ...headers },
    });
    assert.equal(delRes.status, 200);

    // Check not in normal list
    list = await (await call('/api/bookings?page=1&limit=10')).json();
    assert.equal(list.pagination.total, 2);
    assert.ok(!list.bookings.find(b => b.id === id));

    // Check in deleted list
    list = await (await call('/api/bookings?page=1&limit=10&deleted=1')).json();
    assert.equal(list.pagination.total, 3);

    // Restore
    const restoreRes = await fetch(base + '/api/bookings/' + id + '/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base, ...headers },
      body: JSON.stringify({}),
    });
    assert.equal(restoreRes.status, 200);

    list = await (await call('/api/bookings?page=1&limit=10')).json();
    assert.equal(list.pagination.total, 3);
  } finally {
    await new Promise(r => s.close(r));
    await db.close();
    await cleanup();
  }
});
