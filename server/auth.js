import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { unlinkSync } from 'node:fs';

const digest = s => createHash('sha256').update(s).digest('hex');

/** Wrap async route handler — forwards thrown errors to Express error handler */
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

export function installAdmin(app, db, createBooking, upload, todayWIB) {
  const local = req =>
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(req.hostname) &&
    !req.headers['x-forwarded-for'];

  const sameOrigin = (req, res, next) => {
    if (req.headers.origin !== `${req.protocol}://${req.get('host')}`)
      return res.status(403).json({ error: 'Origin tidak diizinkan.' });
    next();
  };

  const attempts = new Map();
  const limit = (req, res, next) => {
    const key = req.socket.remoteAddress;
    const now = Date.now();
    const state = attempts.get(key) || { n: 0, until: now + 900000 };
    if (state.until < now) { state.n = 0; state.until = now + 900000; }
    attempts.set(key, state);
    if (++state.n > 20) return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu 15 menit.' });
    next();
  };

  // Setup
  app.get('/api/setup', wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ needed: !(await db.prepare('SELECT id FROM admin WHERE id=1').get()), local: local(req) });
  }));

  app.post('/api/setup', sameOrigin, limit, wrap(async (req, res) => {
    if (!local(req)) return res.status(403).json({ error: 'Setup hanya melalui localhost tanpa proxy.' });
    if (await db.prepare('SELECT id FROM admin WHERE id=1').get()) return res.status(409).json({ error: 'Admin sudah dibuat.' });
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,50}$/.test(username) || typeof password !== 'string' || password.length < 12 || password.length > 200)
      return res.status(400).json({ error: 'Username 3–50 karakter; password minimal 12 karakter.' });
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    try {
      await db.prepare('INSERT INTO admin VALUES(?,?,?,?)').run(1, username, salt, hash);
    } catch {
      return res.status(409).json({ error: 'Admin sudah dibuat.' });
    }
    res.status(201).json({ ok: true });
  }));

  // Login
  app.post('/api/login', sameOrigin, limit, wrap(async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof password !== 'string' || password.length > 200)
      return res.status(401).json({ error: 'Username atau password salah.' });
    const admin = await db.prepare('SELECT * FROM admin WHERE id=1').get();
    const actual = scryptSync(password, admin?.salt || 'dummy-salt', 64);
    if (!admin || admin.username !== username || !timingSafeEqual(actual, Buffer.from(admin.hash, 'hex')))
      return res.status(401).json({ error: 'Username atau password salah.' });
    const token = randomBytes(32).toString('hex');
    const csrf = randomBytes(32).toString('hex');
    await db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    await db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), csrf, Date.now() + 8 * 3600000);
    res.cookie('session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === '1', maxAge: 8 * 3600000, path: '/' });
    res.json({ csrf, username });
  }));

  // Auth middleware
  const auth = wrap(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const token = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('session='))?.slice(8) || '';
    req.session = await db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(digest(token), Date.now());
    if (!req.session) return res.status(401).json({ error: 'Silakan masuk.' });
    next();
  });

  const csrf = (req, res, next) => {
    if (req.get('X-CSRF-Token') !== req.session.csrf) return res.status(403).json({ error: 'Token keamanan tidak valid.' });
    next();
  };

  // Admin create booking
  app.post('/api/admin/bookings', auth, sameOrigin, csrf, createBooking);

  // Me
  app.get('/api/me', auth, wrap(async (req, res) =>
    res.json({ csrf: req.session.csrf, username: (await db.prepare('SELECT username FROM admin WHERE id=1').get()).username })));

  // Logout
  app.post('/api/logout', auth, sameOrigin, csrf, wrap(async (req, res) => {
    await db.prepare('DELETE FROM sessions WHERE token=?').run(req.session.token);
    res.clearCookie('session', { path: '/' });
    res.json({ ok: true });
  }));

  // List bookings with pagination (excludes soft-deleted by default)
  app.get('/api/bookings', auth, wrap(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const includeDeleted = req.query.deleted === '1';

    const whereClause = includeDeleted ? '' : 'WHERE deleted = 0';
    const countRow = await db.prepare(`SELECT COUNT(*) AS total FROM bookings ${whereClause}`).get();
    const total = countRow.total;
    const rows = await db.prepare(`SELECT * FROM bookings ${whereClause} ORDER BY created DESC LIMIT ? OFFSET ?`).all(limit, offset);

    res.json({
      bookings: rows.map(b => {
        const parsed = typeof b.data === 'string' ? JSON.parse(b.data) : b.data;
        return { ...b, ...parsed, data: undefined };
      }),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }));

  // Update booking status/dp/notes
  app.patch('/api/bookings/:id', auth, sameOrigin, csrf, wrap(async (req, res) => {
    const { status, dp, notes } = req.body || {};
    if (
      !['baru', 'dihubungi', 'menunggu_dp', 'dp_diterima', 'dikonfirmasi', 'selesai', 'batal'].includes(status) ||
      !Number.isSafeInteger(dp) || dp < 0 || dp > 100000000000 ||
      typeof notes !== 'string' || notes.length > 5000
    )
      return res.status(400).json({ error: 'Status, DP atau catatan tidak valid.' });
    const result = await db.prepare('UPDATE bookings SET status=?,dp=?,notes=? WHERE id=? AND deleted=0').run(status, dp, notes, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Booking tidak ditemukan.' });
    res.json({ ok: true });
  }));

  // Edit booking identity (name, phone, location, date, package fields)
  app.put('/api/bookings/:id', auth, sameOrigin, csrf, wrap(async (req, res) => {
    const b = req.body || {};
    const existing = await db.prepare('SELECT * FROM bookings WHERE id=? AND deleted=0').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Booking tidak ditemukan.' });

    const oldData = typeof existing.data === 'string' ? JSON.parse(existing.data) : existing.data;
    const packages = ['makeup', 'makeup_dekor', 'dekor', 'custom'];

    // Validate editable fields
    if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 100) return res.status(400).json({ error: 'Nama tidak valid.' });
    if (typeof b.phone !== 'string' || !b.phone.trim()) return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi.' });
    if (!/^\+?\d{9,15}$/.test(b.phone)) return res.status(400).json({ error: 'Format nomor tidak valid.' });
    if (!packages.includes(b.package)) return res.status(400).json({ error: 'Paket tidak valid.' });
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(b.date) && !Number.isNaN(Date.parse(b.date)) && new Date(b.date).toISOString().slice(0, 10) === b.date;
    if (!validDate) return res.status(400).json({ error: 'Tanggal tidak valid.' });
    if (typeof b.location !== 'string' || !b.location.trim() || b.location.length > 500) return res.status(400).json({ error: 'Lokasi tidak valid.' });
    if (['makeup', 'makeup_dekor'].includes(b.package) && (!Number.isInteger(b.makeupPeople) || b.makeupPeople < 1 || b.makeupPeople > 100))
      return res.status(400).json({ error: 'Jumlah orang makeup tidak valid.' });
    if (['dekor', 'makeup_dekor'].includes(b.package) && b.theme !== undefined && b.theme !== null && (typeof b.theme !== 'string' || b.theme.length > 300))
      return res.status(400).json({ error: 'Tema dekorasi tidak valid.' });
    if (b.package === 'custom' && (!b.requirements || typeof b.requirements !== 'string' || !b.requirements.trim() || b.requirements.length > 2000))
      return res.status(400).json({ error: 'Kebutuhan custom tidak valid.' });

    const newData = {
      ...oldData,
      name: b.name.trim(),
      phone: b.phone || '',
      package: b.package,
      date: b.date,
      location: b.location.trim(),
      makeupPeople: b.makeupPeople,
      theme: b.theme,
      requirements: b.requirements,
    };
    await db.prepare('UPDATE bookings SET data=? WHERE id=?').run(JSON.stringify(newData), req.params.id);
    res.json({ ok: true });
  }));

  // Soft-delete booking
  app.delete('/api/bookings/:id', auth, sameOrigin, csrf, wrap(async (req, res) => {
    const result = await db.prepare('UPDATE bookings SET deleted=1, deleted_at=? WHERE id=? AND deleted=0').run(new Date().toISOString(), req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Booking tidak ditemukan.' });
    res.json({ ok: true });
  }));

  // Restore soft-deleted booking
  app.post('/api/bookings/:id/restore', auth, sameOrigin, csrf, wrap(async (req, res) => {
    const result = await db.prepare('UPDATE bookings SET deleted=0, deleted_at=NULL WHERE id=? AND deleted=1').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Booking tidak ditemukan atau belum dihapus.' });
    res.json({ ok: true });
  }));

  // Upload proof of DP transfer
  app.post('/api/bookings/:id/proof', auth, sameOrigin, csrf, upload.single('proof'), wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File bukti transfer tidak valid. Format: jpg/png/webp/pdf, max 5MB.' });
    const existing = await db.prepare('SELECT proof_path FROM bookings WHERE id=? AND deleted=0').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Booking tidak ditemukan.' });
    if (existing.proof_path) {
      try { unlinkSync(existing.proof_path); } catch { /* ignore */ }
    }
    const proofPath = req.file.path;
    await db.prepare('UPDATE bookings SET proof_path=? WHERE id=?').run(proofPath, req.params.id);
    res.json({ ok: true, path: `/uploads/proofs/${req.file.filename}` });
  }));

  // Delete proof
  app.delete('/api/bookings/:id/proof', auth, sameOrigin, csrf, wrap(async (req, res) => {
    const existing = await db.prepare('SELECT proof_path FROM bookings WHERE id=? AND deleted=0').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Booking tidak ditemukan.' });
    if (existing.proof_path) {
      try { unlinkSync(existing.proof_path); } catch { /* ignore */ }
    }
    await db.prepare('UPDATE bookings SET proof_path=NULL WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  }));
}
