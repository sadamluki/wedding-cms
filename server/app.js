import express from 'express';
import { installAdmin } from './auth.js';
import { openMySQL } from './database.js';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uploadsDir = resolve(root, 'uploads', 'proofs');
mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  },
});

/** WIB date helper: returns YYYY-MM-DD in UTC+7 */
function todayWIB() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

export async function createApp(options) {
  const db = await openMySQL(options);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '24kb' }));

  // Serve uploaded proofs
  app.use('/uploads/proofs', express.static(uploadsDir));

  const createBooking = (admin = false) => async (req, res) => {
    const b = req.body || {};
    const packages = ['makeup', 'makeup_dekor', 'dekor', 'custom'];
    const today = todayWIB();
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
      !Number.isNaN(Date.parse(b.date)) &&
      new Date(b.date).toISOString().slice(0, 10) === b.date &&
      b.date >= today;
    if (
      typeof b.name !== 'string' || !b.name.trim() || b.name.length > 100 ||
      typeof b.phone !== 'string' || !/^\+?\d{9,15}$/.test(b.phone) ||
      !packages.includes(b.package) || !validDate ||
      typeof b.location !== 'string' || !b.location.trim() || b.location.length > 500 ||
      (!admin && b.consent !== true) ||
      (['makeup', 'makeup_dekor'].includes(b.package) && (!Number.isInteger(b.makeupPeople) || b.makeupPeople < 1 || b.makeupPeople > 100)) ||
      (b.theme !== undefined && b.theme !== null && (typeof b.theme !== 'string' || b.theme.length > 300)) ||
      (b.package === 'custom' && (!b.requirements || typeof b.requirements !== 'string' || !b.requirements.trim() || b.requirements.length > 2000))
    )
      return res.status(400).json({ error: 'Lengkapi data dan kebutuhan paket dengan benar.' });

    const id = randomUUID();
    const data = {
      name: b.name.trim(),
      phone: b.phone || '',
      package: b.package,
      date: b.date,
      location: b.location.trim(),
      makeupPeople: b.makeupPeople,
      theme: b.theme,
      requirements: b.requirements,
      consent: !admin,
      source: admin ? 'admin' : 'public',
    };
    await db.prepare('INSERT INTO bookings(id,created,data) VALUES(?,?,?)').run(id, new Date().toISOString(), JSON.stringify(data));
    res.status(201).json({ reference: id });
  };

  app.post('/api/bookings', createBooking());
  installAdmin(app, db, createBooking(true), upload, todayWIB);
  return { app, db };
}
