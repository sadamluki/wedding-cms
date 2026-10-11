import React, { useState } from 'react';
import { packages, api, todayWIB } from './shared.jsx';

const packageMeta = {
  makeup: { label: 'Makeup', sub: 'Pesona yang autentik' },
  makeup_dekor: { label: 'Makeup & Dekor', sub: 'Satu harmoni istimewa' },
  dekor: { label: 'Dekorasi', sub: 'Ruang penuh cerita' },
  custom: { label: 'Custom', sub: 'Sesuai kebutuhan Anda' },
};

export function Booking({ admin = false, user, onCreated, onCancel } = {}) {
  const [pkg, setPkg] = useState('makeup');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const result = await api(
        admin ? '/admin/bookings' : '/bookings',
        { ...f, package: pkg, makeupPeople: f.makeupPeople ? Number(f.makeupPeople) : undefined, consent: f.consent === 'on' },
        'POST',
        user?.csrf
      );
      if (admin) { onCreated?.(result); return; }
      setRef(result.reference);
      showToast(`Terima kasih ${f.name}, permintaan booking ${packages[pkg]} telah diterima!`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const today = todayWIB();
  const needsMakeup = ['makeup', 'makeup_dekor'].includes(pkg);
  const needsTheme = ['dekor', 'makeup_dekor'].includes(pkg);
  const isCustom = pkg === 'custom';

  // Admin mode: compact Tailwind form
  if (admin) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] p-4 sm:p-6 lg:p-8">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-brand-gold uppercase block">RENCANAKAN HARI ISTIMEWA</span>
              <h2 className="font-serif-heading text-brand-navy font-normal text-xl sm:text-2xl mt-1">Tambah Booking</h2>
            </div>
            <button type="button" onClick={onCancel}
              className="flex-shrink-0 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-lg transition-colors">
              Batal
            </button>
          </div>
          <p className="text-xs text-gray-500">Semua kolom bertanda * wajib diisi.</p>

          {/* Service cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(packageMeta).map(([id, meta]) => (
              <div key={id} onClick={() => setPkg(id)} role="button" aria-pressed={pkg === id} tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPkg(id); } }}
                className={`service-card p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between min-h-[72px]${pkg === id ? ' active' : ''}`}>
                <span className="font-semibold text-sm">{meta.label}</span>
                <span className="card-subtitle text-xs mt-1">{meta.sub}</span>
              </div>
            ))}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama lengkap *</label><input name="name" required maxLength={100} autoComplete="name" placeholder="Nama klien" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Nomor WhatsApp *</label><input name="phone" type="tel" pattern="\+?[0-9]{9,15}" required placeholder="081234567890" autoComplete="tel" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Tanggal acara *</label><input name="date" type="date" min={today} required className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800" /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Lokasi acara *</label><input name="location" required maxLength={500} placeholder="Kota dan nama venue" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" /></div>
            {needsMakeup && <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Jumlah orang makeup *</label><input name="makeupPeople" type="number" min="1" max="100" required placeholder="1" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" /></div>}
            {needsTheme && <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Tema / konsep dekorasi (opsional)</label><input name="theme" maxLength={300} placeholder="Contoh: intimate garden" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" /></div>}
          </div>
          {isCustom && (
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Kebutuhan khusus *</label><textarea name="requirements" required maxLength={2000} placeholder="Layanan yang dibutuhkan, konsep, dan detail acara" className="custom-textarea w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" /></div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3" role="alert">{error}</div>}
          <button disabled={busy} className="w-full bg-brand-navy hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 text-sm shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait">
            {busy ? 'Mengirim…' : 'Simpan booking'}
          </button>
          <p className="text-[11px] text-gray-400 text-center">Jadwal dan DP dikonfirmasi manual oleh admin. Tidak ada pembayaran otomatis.</p>
        </form>
      </div>
    );
  }

  // Public booking: Tailwind template
  return (
    <>
      <main className="w-full max-w-7xl mx-auto px-4 xs:px-6 lg:px-12 py-4 lg:py-8 flex-grow">
        {ref ? (
          /* Success state */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-5 xs:p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100/80 text-center space-y-5">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-brand-gold uppercase block">TERIMA KASIH</span>
              <h2 className="font-serif-heading fluid-card-title text-brand-navy font-normal">Permintaan tersimpan.</h2>
              <p className="text-sm text-gray-600 leading-relaxed">Tim kami akan meninjau kebutuhan Anda. Pengiriman ini belum menjadi konfirmasi jadwal atau pembayaran.</p>
              <p className="text-xs text-gray-400 break-all">Referensi: {ref}</p>
              <a
                className="inline-flex items-center justify-center space-x-2 bg-brand-navy hover:bg-slate-800 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 text-sm shadow-md"
                href={'https://wa.me/6281299978037?text=' + encodeURIComponent('Halo Xavier Pro Wedding, saya ingin konsultasi booking dengan referensi ' + ref)}
                target="_blank"
                rel="noreferrer"
              >
                <span>Lanjut konsultasi WhatsApp</span>
                <span className="text-brand-gold text-base ml-1">↗</span>
              </a>
            </div>
          </div>
        ) : (
          /* Booking form */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xs:gap-10 lg:gap-16 items-start">

            {/* Left Column: Branding */}
            <div className="lg:col-span-5 space-y-6 sm:space-y-8 pt-2 lg:pt-6 text-left">
              <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-brand-gold uppercase">
                XAVIER PRO WEDDING · BOOKING
              </div>
              <h1 className="font-serif-heading fluid-hero-title text-brand-navy font-normal">
                Awal indah untuk <br />
                <span className="italic text-brand-gold font-serif-heading">cerita Anda.</span>
              </h1>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-lg">
                Makeup yang personal. Dekorasi yang bermakna.<br className="hidden xs:inline" />
                Ceritakan rencana acara Anda, kami bantu mewujudkannya.
              </p>
              <div className="relative pl-5 sm:pl-6 border-l-2 border-brand-gold space-y-2.5 sm:space-y-3 py-1">
                <div className="text-xs sm:text-sm text-gray-700 font-medium">01 Pilih layanan</div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium">02 Ceritakan acara</div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium">03 Konsultasi bersama</div>
              </div>
              <p className="font-serif-heading italic text-gray-600 text-base sm:text-xl leading-snug max-w-md pt-1 sm:pt-2">
                Setiap acara memiliki ceritanya sendiri. Penawaran disusun setelah konsultasi—tanpa harga paket publik.
              </p>
            </div>

            {/* Right Column: Form Card */}
            <div className="lg:col-span-7 w-full">
              <div className="bg-white rounded-2xl p-5 xs:p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100/80 w-full">

                <div className="space-y-1 mb-6">
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-brand-gold uppercase block">
                    RENCANAKAN HARI ISTIMEWA
                  </span>
                  <h2 className="font-serif-heading fluid-card-title text-brand-navy font-normal">
                    Permintaan booking
                  </h2>
                  <p className="text-xs text-gray-500 pt-1">Semua kolom bertanda * wajib diisi.</p>
                </div>

                <form onSubmit={submit} className="space-y-5 sm:space-y-6">

                  {/* Service Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(packageMeta).map(([id, meta]) => (
                      <div
                        key={id}
                        onClick={() => setPkg(id)}
                        className={`service-card p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between min-h-[72px]${pkg === id ? ' active' : ''}`}
                        role="button"
                        aria-pressed={pkg === id}
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPkg(id); } }}
                      >
                        <span className="font-semibold text-sm">{meta.label}</span>
                        <span className="card-subtitle text-xs mt-1">{meta.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Input Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 mb-1.5">Nama lengkap *</label>
                      <input type="text" id="fullName" name="name" required maxLength={100} autoComplete="name" placeholder="Nama Anda" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                    </div>
                    <div>
                      <label htmlFor="whatsapp" className="block text-xs font-semibold text-gray-700 mb-1.5">Nomor WhatsApp *</label>
                      <input type="tel" id="whatsapp" name="phone" pattern="\+?[0-9]{9,15}" required autoComplete="tel" placeholder="081234567890" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                    </div>
                    <div>
                      <label htmlFor="eventDate" className="block text-xs font-semibold text-gray-700 mb-1.5">Tanggal acara *</label>
                      <input type="date" id="eventDate" name="date" required min={today} className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800" />
                    </div>
                    <div>
                      <label htmlFor="location" className="block text-xs font-semibold text-gray-700 mb-1.5">Lokasi acara *</label>
                      <input type="text" id="location" name="location" required maxLength={500} placeholder="Kota dan nama venue" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                    </div>

                    {/* Conditional: Jumlah orang makeup */}
                    {needsMakeup && (
                      <div>
                        <label htmlFor="makeupPeople" className="block text-xs font-semibold text-gray-700 mb-1.5">Jumlah orang makeup *</label>
                        <input type="number" id="makeupPeople" name="makeupPeople" min="1" max="100" required placeholder="1" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                      </div>
                    )}

                    {/* Conditional: Tema dekorasi */}
                    {needsTheme && (
                      <div>
                        <label htmlFor="theme" className="block text-xs font-semibold text-gray-700 mb-1.5">Tema / konsep dekorasi (opsional)</label>
                        <input type="text" id="theme" name="theme" maxLength={300} placeholder="Contoh: intimate garden" className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Conditional: Custom requirements */}
                  {isCustom && (
                    <div>
                      <label htmlFor="requirements" className="block text-xs font-semibold text-gray-700 mb-1.5">Kebutuhan khusus *</label>
                      <textarea id="requirements" name="requirements" required maxLength={2000} placeholder="Layanan yang dibutuhkan, konsep, dan detail acara" className="custom-textarea w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                    </div>
                  )}

                  {/* Agreement Checkbox */}
                  <div className="flex items-start space-x-3 pt-2">
                    <input type="checkbox" id="agreement" name="consent" required className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy accent-[#0F1C2E] flex-shrink-0 cursor-pointer" />
                    <label htmlFor="agreement" className="text-xs text-gray-500 leading-relaxed cursor-pointer select-none">
                      Saya memberikan persetujuan penggunaan data ini untuk konsultasi dan pengelolaan booking. Data disimpan hingga ada permintaan penghapusan melalui admin.
                    </label>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3" role="alert">{error}</div>
                  )}

                  {/* Submit */}
                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full bg-brand-navy hover:bg-slate-800 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm shadow-md active:scale-[0.99] touch-manipulation disabled:opacity-60 disabled:cursor-wait"
                    >
                      <span>{busy ? 'Mengirim…' : 'Kirim permintaan'}</span>
                      {!busy && <span className="text-brand-gold text-base ml-1">→</span>}
                    </button>
                    <p className="text-[11px] text-gray-400 text-center leading-normal">
                      Jadwal dan DP dikonfirmasi manual oleh admin. Tidak ada pembayaran otomatis.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      <div className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 bg-brand-navy text-white px-5 py-4 rounded-xl shadow-2xl transition-all duration-300 transform flex items-center justify-center sm:justify-start space-x-3 z-50 max-w-md mx-auto ${toast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="w-2.5 h-2.5 rounded-full bg-brand-gold flex-shrink-0"></div>
        <span className="text-xs sm:text-sm font-medium">{toast}</span>
      </div>
    </>
  );
}
