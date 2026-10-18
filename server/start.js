import { createApp } from './app.js';
import express from 'express';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const mysqlOptions = process.env.DATABASE_URL
  ? { uri: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'xavier_wedding',
    };

let instance;
try {
  instance = await createApp(mysqlOptions);
} catch (err) {
  console.error('Database initialization failed. Check MySQL configuration and server availability.');
  console.error(err.message);
  process.exit(1);
}

const { app, db } = instance;

app.get('/', (req, res) => res.sendFile(resolve(root, 'public/index.html')));
app.use(express.static(resolve(root, 'public')));
app.use(express.static(resolve(root, 'dist')));
app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(resolve(root, 'dist/index.html'));
});
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}:`, err.message, err.stack);
  res.status(err.status || 500).json({ error: err.status === 400 ? 'Format permintaan tidak valid.' : 'Terjadi kesalahan server.' });
});

const port = Number(process.env.PORT || 3100);
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => {
  const addr = server.address();
  const shownPort = addr && typeof addr === 'object' ? addr.port : port;
  console.log(`CMS (mysql) ready: http://127.0.0.1:${shownPort}`);
});
server.on('error', async err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} sudah dipakai. Hentikan proses lama atau set PORT berbeda.`);
  } else {
    console.error('Server error:', err.message);
  }
  try { await db.close(); } catch { /* ignore */ }
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(async () => { await db.close(); process.exit(0); }));
