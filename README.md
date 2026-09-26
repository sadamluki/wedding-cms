# Xavier Pro Wedding — CMS

Project mandiri: React + Vite, Node/Express, SQLite **file di backend**. Tidak menggunakan localStorage sebagai database. Folder Website tidak disentuh.

## Menjalankan (Windows Git Bash)

Prasyarat Node 22.15+ (node:sqlite tersedia; versi 22 mengeluarkan ExperimentalWarning), npm.

```bash
cd /d/Projects/Wedding/CMS
npm ci
npm run build
npm start
```

- Publik: http://127.0.0.1:3100/booking
- Admin / setup awal: http://127.0.0.1:3100/admin
- Database: `D:\Projects\Wedding\CMS\data\cms.sqlite`
- PORT, HOST, DB_PATH dapat diatur lewat environment. Default hanya bind loopback.
- Development: jalankan `npm start` dan `npm run dev` di terminal berbeda. Gunakan port 3100 untuk setup/login; proxy Vite bukan konfigurasi produksi.

## Admin pertama

Tidak ada akun/password bawaan. Buka `/admin` langsung di komputer server menggunakan localhost/127.0.0.1. Buat username (3–50 karakter huruf/angka/._-) dan password minimal 12 karakter. Password tidak dicetak/log dan disimpan sebagai salted scrypt hash. Setup menolak koneksi non-loopback, host non-local, forwarded-for, dan origin berbeda; sesudah satu admin dibuat endpoint terkunci. Jangan expose server sebelum setup selesai. Komputer lokal harus dipercaya—pengguna lokal lain bisa mengklaim setup pertama. Simpan password di password manager. Belum tersedia pemulihan password mandiri; jangan hapus database untuk reset karena booking ikut hilang.

Session cookie HttpOnly/SameSite Strict, berlaku 8 jam; token session dihash di DB. Mutasi admin memerlukan token CSRF dan origin yang sama. Login/setup dibatasi 20 percobaan/15 menit per alamat koneksi. Data booking tidak dapat dibaca tanpa login. Public API hanya mengembalikan referensi setelah submit.

## Fitur

- Empat paket tanpa harga publik: makeup, makeup_dekor, dekor, custom.
- Field bersyarat: jumlah orang makeup, tema dekorasi, kebutuhan custom.
- Validasi browser + server, tanggal valid dan tidak lampau, persetujuan penggunaan data.
- Booking masuk SQLite dan tampil di dashboard. Tidak ada data bisnis dummy.
- Filter nama/nomor/lokasi, paket, status, tanggal; agenda mendatang terurut. Beberapa acara boleh pada tanggal sama; tidak ada pemblokiran otomatis.
- Detail booking; edit catatan internal, status dan nominal DP rupiah bulat. Verifikasi DP sepenuhnya manual, tidak terhubung bank/payment gateway.
- WhatsApp hanya tautan dengan pesan awal, tidak mengirim otomatis.
- Data tidak kedaluwarsa otomatis. Session kedaluwarsa tidak menghapus booking.

## Backup dan restore

1. Hentikan server dengan Ctrl+C dan pastikan proses selesai.
2. Salin seluruh folder `data/` ke lokasi backup aman/terenkripsi (termasuk `-wal`/`-shm` bila masih ada). Jangan hanya menyalin sqlite saat server aktif: transaksi terbaru mungkin masih di WAL.
3. Untuk restore, hentikan server, simpan backup keadaan sekarang, lalu ganti seluruh folder data dengan snapshot yang konsisten. Jalankan ulang dan periksa booking.
4. Database mengandung data pribadi dan hash login: batasi ACL folder ke operator server, jangan upload ke git/public web. Lakukan backup berkala dan uji restore. Tidak ada backup otomatis.

Permintaan penghapusan data pribadi ditangani operator setelah verifikasi identitas dan kewajiban retensi. Belum ada tombol hapus: operator DB berwenang dapat menghapus baris berdasarkan UUID menggunakan prepared statement/SQLite client saat maintenance. Kebijakan backup juga perlu disesuaikan agar data yang wajib dihapus tidak dipulihkan. Retensi tanpa auto-expiry bukan jaminan kepatuhan hukum.

## Verifikasi

```bash
npm test
npm run build
node tests/browser.mjs
```

Test HTTP memakai database sementara / memory. Test browser memakai Microsoft Edge terpasang, port 3101, database sementara yang dibuang setelah test. Data sintetis hanya di test dan screenshot, tidak di database bisnis. Bukti PNG ada di `artifacts/booking-desktop.png`, `artifacts/booking-mobile.png`, `artifacts/admin-desktop.png`.

## Batasan sebelum deployment internet

Versi ini cocok satu admin dan volume kecil pada satu proses/server dengan disk persisten. SQLite bukan database browser/cloud; jangan gunakan filesystem ephemeral atau berbagi file melalui network drive. Semua booking dimuat ke admin; belum pagination, audit trail, role tambahan, upload bukti, kalender grid, invoice, edit identitas booking atau notifikasi otomatis. Agenda tersedia sebagai alternatif kalender.

Untuk publikasi wajib HTTPS, secure cookie (`COOKIE_SECURE=1`), konfigurasi proxy/origin yang benar (origin check saat ini memakai protocol/Host langsung; jangan sekadar mengaktifkan trust proxy tanpa membatasi proxy terpercaya), proteksi spam/rate limit publik di edge, monitoring, dan backup. Jangan expose port Node langsung. Setup tetap dilakukan lokal sebelum proxy. Belum ada CAPTCHA/public-submit rate limiter sehingga jangan membuka langsung ke internet tanpa proteksi edge. UI memakai Google Fonts dengan fallback lokal. Tanggal minimum menggunakan hari UTC; bila butuh aturan WIB penuh, sesuaikan zona waktu secara eksplisit.
