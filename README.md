# Xavier Pro Wedding — CMS

Project mandiri: React + Vite, Node/Express, **MySQL**. Folder Website tidak disentuh.

## Menjalankan (Windows Git Bash)

Prasyarat Node 22+, npm, MySQL 8.0+ aktif.

```bash
cd /d/Projects/Wedding/CMS
npm ci
npm run build
npm start
```

### Konfigurasi database

Default: MySQL di `127.0.0.1:3306`, user `root` tanpa password, database `xavier_wedding`.

Konfigurasi lewat file `.env` di root project (sudah di-gitignore, jangan commit). Salin template:

```bash
cp .env.example .env
```

Lalu edit isinya. `npm start` otomatis memuat `.env` (Node 22 `--env-file-if-exists`).

Environment variables (bisa juga di-set langsung di shell, override `.env`):
- `DB_HOST` — MySQL host (default: `127.0.0.1`)
- `DB_PORT` — MySQL port (default: `3306`)
- `DB_USER` — MySQL user (default: `root`)
- `DB_PASSWORD` — MySQL password (default: kosong)
- `DB_NAME` — nama database (default: `xavier_wedding`)
- `DATABASE_URL` — alternatif URI lengkap (misal: `mysql://user:***@host:3306/dbname`)
- `PORT` — port HTTP (default: `3100`)
- `HOST` — bind address (default: `127.0.0.1`)
- `COOKIE_SECURE` — set `1` untuk HTTPS

Buat database terlebih dahulu:
```sql
CREATE DATABASE xavier_wedding CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Schema (tabel bookings, admin, sessions) dibuat otomatis saat server start.

- Website utama (disalin dari `D:\Projects\Wedding\Website` ke `public/`): http://127.0.0.1:3100/
- Form booking: http://127.0.0.1:3100/booking.html
- Admin / setup awal: http://127.0.0.1:3100/admin
- Development: jalankan `npm start` dan `npm run dev` di terminal berbeda. Gunakan port 3100 untuk setup/login; proxy Vite bukan konfigurasi produksi.

## Admin pertama

Tidak ada akun/password bawaan. Buka `/admin` langsung di komputer server menggunakan localhost/127.0.0.1. Buat username (3–50 karakter huruf/angka/._-) dan password minimal 12 karakter. Password disimpan sebagai salted scrypt hash. Setup menolak koneksi non-loopback. Simpan password di password manager.

Session cookie HttpOnly/SameSite Strict, berlaku 8 jam; token session dihash di DB. Mutasi admin memerlukan token CSRF dan origin yang sama. Login/setup dibatasi 20 percobaan/15 menit per alamat koneksi.

## Fitur

- **Empat paket** tanpa harga publik: makeup, makeup_dekor, dekor, custom.
- **Field bersyarat**: jumlah orang makeup, tema dekorasi, kebutuhan custom.
- **Validasi browser + server**, tanggal menggunakan zona WIB (UTC+7).
- **Dashboard admin** dengan filter, agenda, dan kalender grid.
- **Pagination**: booking dimuat per halaman (default 50, max 100).
- **Edit identitas booking**: perbaiki nama, nomor, lokasi, paket, tanggal dari dashboard.
- **Soft-delete booking**: hapus dari tampilan aktif, dapat dipulihkan (restore).
- **Upload bukti transfer DP**: JPG/PNG/WebP/PDF, max 5MB per booking.
- **WhatsApp** hanya tautan dengan pesan awal, tidak mengirim otomatis.
- Status workflow: baru → dihubungi → menunggu_dp → dp_diterima → dikonfirmasi → selesai/batal.
- DP nominal rupiah (manual, tanpa payment gateway).
- Data tidak kedaluwarsa otomatis.

## Backup dan restore

1. Gunakan `mysqldump` untuk backup database:
```bash
mysqldump -u root xavier_wedding > backup.sql
```
2. Restore:
```bash
mysql -u root xavier_wedding < backup.sql
```
3. Backup juga folder `uploads/proofs/` bila ada bukti transfer.

## Verifikasi

```bash
npm test
npm run build
```

Test membutuhkan MySQL aktif di localhost. Setiap test membuat database sementara yang dihapus setelah selesai.

## Struktur kode

```
server/
  app.js          — Express app, routing, booking creation
  auth.js         — Authentication, CSRF, admin endpoints, pagination, edit, delete, upload
  database.js     — MySQL adapter (mysql2/promise)
  start.js        — Server bootstrap
src/
  App.jsx         — Root component (thin router)
  BookingCalendar.jsx — Calendar grid component
  components/
    shared.jsx    — API helpers, constants, formatters
    Booking.jsx   — Booking form (public + admin create)
    Login.jsx     — Admin login/setup screen
    Dashboard.jsx — Admin dashboard with filters/pagination
    BookingDetail.jsx — Booking detail panel with edit/delete/upload
```

## Batasan sebelum deployment internet

Wajib HTTPS, secure cookie (`COOKIE_SECURE=1`), konfigurasi proxy/origin, proteksi spam/rate limit publik di edge, monitoring, dan backup. Jangan expose port Node langsung. Belum ada CAPTCHA/public-submit rate limiter.
