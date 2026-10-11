import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

test('calendar renders Indonesian month grid with every same-date booking and status', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { BookingCalendar } = await vite.ssrLoadModule('/src/BookingCalendar.jsx');
    const statuses = { baru: 'Baru', dihubungi: 'Dihubungi', menunggu_dp: 'Menunggu DP', dp_diterima: 'DP diterima', dikonfirmasi: 'Dikonfirmasi', selesai: 'Selesai', batal: 'Batal' };
    const rows = Object.keys(statuses).map((status, i) => ({ id: String(i), name: 'Klien ' + i, date: '2028-12-20', package: 'makeup', status }));
    const html = renderToStaticMarkup(React.createElement(BookingCalendar, { rows, statuses, packages: { makeup: 'Makeup' }, initialMonth: new Date(2028, 11, 1), onSelect: () => {} }));
    assert.match(html, /Desember 2028/);
    for (const day of ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']) assert.ok(html.includes(day));
    assert.equal((html.match(/class="calendar-event /g) || []).length, 7);
    for (const status of Object.keys(statuses)) assert.ok(html.includes('calendar-event ' + status));
    assert.match(html, /7 booking di bulan ini/);
    assert.match(html, /Bulan sebelumnya/);
    assert.match(html, /Hari ini/);
  } finally {
    await vite.close();
  }
});
