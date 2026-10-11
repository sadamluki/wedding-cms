import React, { useState } from 'react';
import { packages, statuses, api, apiUpload, apiDelete, todayWIB } from './shared.jsx';

export function BookingDetail({ selected, user, onClose, onSaved, onDeleted }) {
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editPkg, setEditPkg] = useState(selected.package);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveStatus(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      await api('/bookings/' + selected.id, { ...f, dp: Number(f.dp) }, 'PATCH', user.csrf);
      onSaved('Perubahan booking berhasil disimpan.');
    } catch (e) { setError(e.message); }
  }

  async function saveIdentity(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      await api('/bookings/' + selected.id, { ...f, package: editPkg, makeupPeople: f.makeupPeople ? Number(f.makeupPeople) : undefined }, 'PUT', user.csrf);
      setEditing(false);
      onSaved('Data booking berhasil diperbarui.');
    } catch (e) { setError(e.message); }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      await apiUpload('/bookings/' + selected.id + '/proof', file, user.csrf);
      onSaved('Bukti transfer berhasil diunggah.');
    } catch (e) { setError(e.message); } finally { setUploading(false); }
  }

  async function removeProof() {
    try {
      await apiDelete('/bookings/' + selected.id + '/proof', user.csrf);
      onSaved('Bukti transfer dihapus.');
    } catch (e) { setError(e.message); }
  }

  async function doDelete() {
    try {
      await apiDelete('/bookings/' + selected.id, user.csrf);
      onDeleted('Booking dihapus. Dapat dipulihkan oleh admin bila diperlukan.');
    } catch (e) { setError(e.message); }
  }

  const today = todayWIB();
  const needsMakeup = ['makeup', 'makeup_dekor'].includes(editPkg);
  const needsTheme = ['dekor', 'makeup_dekor'].includes(editPkg);
  const isCustom = editPkg === 'custom';

  const InfoRow = ({ label, children }) => children ? (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 break-words whitespace-pre-wrap">{children}</dd>
    </div>
  ) : null;

  const InputField = ({ label, ...props }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input {...props} className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-brand-navy/40 backdrop-blur-sm flex justify-end z-50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="w-full max-w-lg h-full bg-white overflow-y-auto shadow-2xl" role="dialog" aria-modal="true" aria-label="Detail booking">
        <div className="p-5 sm:p-8 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-serif-heading text-brand-navy font-normal text-xl sm:text-2xl break-words">{selected.name}</h2>
              <p className="text-[10px] text-gray-400 break-all mt-1">{selected.id}</p>
            </div>
            <button autoFocus onClick={onClose} aria-label="Tutup detail"
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors text-sm">
              ✕
            </button>
          </div>

          {!editing ? (
            <>
              {/* Info */}
              <dl className="bg-gray-50/50 rounded-xl p-4 space-y-0">
                <InfoRow label="Acara">{selected.date} · {selected.location}</InfoRow>
                <InfoRow label="Paket">{packages[selected.package]}</InfoRow>
                <InfoRow label="Orang makeup">{selected.makeupPeople}</InfoRow>
                <InfoRow label="Tema">{selected.theme}</InfoRow>
                <InfoRow label="Kebutuhan">{selected.requirements}</InfoRow>
              </dl>

              {/* Edit & WA buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={() => setEditing(true)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium px-4 py-2.5 rounded-lg transition-colors text-center">
                  ✎ Edit data booking
                </button>
                {selected.phone && (
                  <a target="_blank" rel="noreferrer"
                    href={'https://wa.me/' + selected.phone.replace(/^0/, '62').replace(/^\+/, '') + '?text=' + encodeURIComponent(`Halo ${selected.name}, kami dari Xavier Pro Wedding ingin membahas permintaan ${packages[selected.package]} untuk ${selected.date}. Referensi ${selected.id}.`)}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-medium px-4 py-2.5 rounded-lg transition-colors text-center no-underline">
                    WhatsApp ↗
                  </a>
                )}
              </div>

              {/* Status form */}
              <form onSubmit={saveStatus} className="space-y-4 border-t border-gray-100 pt-5">
                <h3 className="font-serif-heading text-brand-navy text-base font-normal">Status & DP</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status booking</label>
                  <select aria-label="Status booking" name="status" defaultValue={selected.status}
                    className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg">
                    {Object.entries(statuses).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>
                <InputField label="DP diterima (Rp) — verifikasi manual" name="dp" type="number" min="0" max="100000000000" step="1" required defaultValue={selected.dp} />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Catatan internal</label>
                  <textarea name="notes" maxLength={5000} defaultValue={selected.notes}
                    className="custom-textarea w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                </div>
                <p className="text-[11px] text-gray-400">Pastikan bukti pembayaran diperiksa sebelum mengubah status DP.</p>
                <button className="w-full bg-brand-navy hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 text-sm shadow-sm active:scale-[0.99]">
                  Simpan perubahan
                </button>
              </form>

              {/* Proof upload */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                <h3 className="font-serif-heading text-brand-navy text-base font-normal">Bukti transfer DP</h3>
                {selected.proof_path ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                    <a href={'/uploads/proofs/' + selected.proof_path.split(/[\\/]/).pop()} target="_blank" rel="noreferrer"
                      className="text-xs text-emerald-700 font-medium no-underline hover:underline flex-1">
                      Lihat bukti transfer ↗
                    </a>
                    <button type="button" onClick={removeProof}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                      Hapus
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">Belum ada bukti transfer diunggah.</p>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Unggah bukti baru (jpg/png/webp/pdf, maks 5MB)</label>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleUpload} disabled={uploading}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-200 file:text-xs file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 file:cursor-pointer file:transition-colors" />
                </div>
                {uploading && <p className="text-[11px] text-brand-gold animate-pulse">Mengunggah…</p>}
              </div>

              {/* Delete */}
              <div className="border-t border-gray-100 pt-5">
                {!confirmDelete ? (
                  <button type="button" onClick={() => setConfirmDelete(true)}
                    className="w-full bg-white hover:bg-red-50 border border-red-200 text-red-500 text-xs font-medium px-4 py-2.5 rounded-lg transition-colors">
                    Hapus booking
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-red-700" role="alert">Yakin hapus booking ini? Data dapat dipulihkan nanti, tetapi tidak muncul di daftar aktif.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmDelete(false)}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-4 py-2.5 rounded-lg transition-colors hover:bg-gray-50">
                        Batal
                      </button>
                      <button type="button" onClick={doDelete}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-4 py-2.5 rounded-lg transition-colors">
                        Ya, hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Edit identity form */
            <form onSubmit={saveIdentity} className="space-y-5">
              <h3 className="font-serif-heading text-brand-navy text-base font-normal">Edit data booking</h3>

              {/* Package cards */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(packages).map(([id, name]) => (
                  <button type="button" key={id} aria-pressed={editPkg === id} onClick={() => setEditPkg(id)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${editPkg === id ? 'bg-brand-navy border-brand-navy text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Nama lengkap *" name="name" required maxLength={100} defaultValue={selected.name} />
                <InputField label="Nomor WhatsApp *" name="phone" type="tel" pattern="\+?[0-9]{9,15}" required defaultValue={selected.phone} />
                <InputField label="Tanggal acara *" name="date" type="date" required defaultValue={selected.date} />
                <InputField label="Lokasi acara *" name="location" required maxLength={500} defaultValue={selected.location} />
                {needsMakeup && <InputField label="Jumlah orang makeup *" name="makeupPeople" type="number" min="1" max="100" required defaultValue={selected.makeupPeople} />}
                {needsTheme && <InputField label="Tema dekorasi (opsional)" name="theme" maxLength={300} defaultValue={selected.theme} />}
              </div>
              {isCustom && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kebutuhan khusus *</label>
                  <textarea name="requirements" required maxLength={2000} defaultValue={selected.requirements}
                    className="custom-textarea w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Batal
                </button>
                <button className="flex-1 bg-brand-navy hover:bg-slate-800 text-white font-medium py-2.5 px-6 rounded-xl transition-all duration-200 text-xs shadow-sm active:scale-[0.99]">
                  Simpan
                </button>
              </div>
            </form>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3" role="alert">{error}</div>}
        </div>
      </section>
    </div>
  );
}
