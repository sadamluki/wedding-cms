import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

test('public React booking renders four packages, consent and no public price', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { Booking } = await vite.ssrLoadModule('/src/App.jsx');
    const html = renderToStaticMarkup(React.createElement(Booking));
    for (const text of ['Makeup', 'Makeup & Dekor', 'Dekorasi', 'Custom', 'Nama lengkap', 'Tanggal acara', 'persetujuan', 'Kirim permintaan'])
      assert.ok(html.includes(text.replaceAll('&', '&amp;')), text);
    assert.ok(!html.includes('Rp'));
    assert.ok(!html.includes('Instagram'));
    assert.ok(!html.includes('Facebook'));
    assert.ok(!html.includes('TikTok'));
    assert.ok(/<input[^>]*required[^>]*name="phone"|<input[^>]*name="phone"[^>]*required/.test(html), 'phone is required');
    const admin = renderToStaticMarkup(React.createElement(Booking, { admin: true, user: { csrf: 'test' } }));
    assert.match(admin, /Tambah Booking/);
    assert.ok(!admin.includes('name="consent"'));
  } finally {
    await vite.close();
  }
});
