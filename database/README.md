# Database

`schema.sql` — struktur tabel MySQL (CREATE TABLE saja, tanpa data). Aman untuk di-publish ke repo.

## Import ke MySQL baru

```bash
mysql -u root -e "CREATE DATABASE xavier_wedding"
mysql -u root xavier_wedding < database/schema.sql
```

Lalu set koneksi via env var (lihat `server/start.js`):

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xavier_wedding
```

## Tabel

- `admin` — 1 baris, kredensial admin tunggal (username + salt + hash password, dibuat lewat `/api/setup`)
- `bookings` — data booking klien (JSON di kolom `data`: nama, nomor WhatsApp, tanggal acara, dll), status, DP, soft-delete
- `sessions` — token sesi login admin aktif (token, csrf, expiry)

**Catatan:** dump ini sengaja tidak menyertakan data (`--no-data`) karena tabel `bookings` berisi data pribadi pelanggan (nomor WhatsApp, nama, lokasi acara) dan tabel `admin` berisi hash password. Jangan commit dump berisi data asli ke repo publik.
