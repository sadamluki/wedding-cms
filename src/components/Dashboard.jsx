import React, { useState, useEffect } from 'react';
import { packages, statuses, api, formatRupiah, todayWIB } from './shared.jsx';
import { Booking } from './Booking.jsx';
import { BookingDetail } from './BookingDetail.jsx';
import { BookingCalendar } from '../BookingCalendar.jsx';

export function Dashboard({ user }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [pkg, setPkg] = useState('');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('list');
  const [adding, setAdding] = useState(false);

  const load = (page = pagination.page) =>
    api(`/bookings?page=${page}&limit=${pagination.limit}`)
      .then(res => { setRows(res.bookings); setPagination(res.pagination); })
      .catch(e => setError(e.message));

  useEffect(() => { load(1); }, []);

  const filtered = rows.filter(
    b =>
      (!status || b.status === status) &&
      (!pkg || b.package === pkg) &&
      (!date || b.date === date) &&
      `${b.name} ${b.phone} ${b.location}`.toLowerCase().includes(query.toLowerCase())
  );
  const today = todayWIB();
  const upcoming = filtered.filter(b => b.date >= today && b.status !== 'batal').sort((a, b) => a.date.localeCompare(b.date));
  const displayRows = view === 'agenda' ? upcoming : filtered;

  function refreshAfterAction(message) {
    setSelected(null);
    setNotice(message);
    load();
  }

  const statCards = [
    { label: 'Total permintaan', value: pagination.total, highlight: true },
    { label: 'Perlu ditindaklanjuti', value: rows.filter(b => b.status === 'baru').length },
    { label: 'DP tercatat manual', value: formatRupiah(rows.reduce((s, b) => s + b.dp, 0)), money: true },
  ];

  const viewTabs = [
    { id: 'list', label: 'Semua booking' },
    { id: 'agenda', label: 'Agenda mendatang' },
    { id: 'calendar', label: 'Kalender' },
  ];

  return (
    <main className="w-full max-w-7xl mx-auto px-4 xs:px-6 lg:px-12 py-6 lg:py-10 flex-grow">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-brand-gold uppercase">XAVIER · MANAGEMENT</span>
          <h1 className="font-serif-heading text-brand-navy font-normal text-3xl sm:text-4xl leading-tight mt-1">Ruang kerja Anda.</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Kelola permintaan, jadwal, dan konfirmasi dengan tenang.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 sm:p-6 ${s.highlight ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white border-gray-200'} ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <span className={`text-[10px] sm:text-xs ${s.highlight ? 'text-gray-300' : 'text-gray-500'}`}>{s.label}</span>
            <strong className={`block font-serif-heading mt-2 ${s.money ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'} ${s.highlight ? 'text-white' : 'text-brand-navy'}`}>
              {s.value}
            </strong>
          </div>
        ))}
      </div>

      {/* Admin create booking (old CSS class form) */}
      {adding && (
        <div className="mb-6">
          <Booking
            admin
            user={user}
            onCancel={() => setAdding(false)}
            onCreated={() => {
              setAdding(false); setQuery(''); setStatus(''); setPkg(''); setDate('');
              setView('list'); setNotice('Booking berhasil ditambahkan.'); load(1);
            }}
          />
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] p-4 sm:p-6 lg:p-8">
        {/* Header + tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="font-serif-heading text-brand-navy font-normal text-xl sm:text-2xl">Daftar booking</h2>
          <button onClick={() => { setAdding(true); setSelected(null); }}
            className="bg-brand-navy hover:bg-slate-800 text-white text-xs font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm">
            + Tambah Booking
          </button>
        </div>

        {/* View tabs */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {viewTabs.map(t => (
            <button key={t.id} aria-pressed={view === t.id} onClick={() => setView(t.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${view === t.id ? 'bg-brand-navy text-brand-gold shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Cari klien / lokasi</label>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nama, WhatsApp, lokasi…"
              className="custom-input w-full px-3 py-2 text-sm rounded-lg" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Status</label>
            <select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}
              className="custom-input w-full px-3 py-2 text-sm rounded-lg">
              <option value="">Semua</option>
              {Object.entries(statuses).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Paket</label>
            <select aria-label="Filter paket" value={pkg} onChange={e => setPkg(e.target.value)}
              className="custom-input w-full px-3 py-2 text-sm rounded-lg">
              <option value="">Semua</option>
              {Object.entries(packages).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="custom-input w-full px-3 py-2 text-sm rounded-lg" />
            </div>
            <button onClick={() => { setQuery(''); setStatus(''); setPkg(''); setDate(''); }}
              className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium px-3 py-2.5 rounded-lg transition-colors flex-shrink-0"
              style={{ minHeight: 46 }}>
              Reset
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3 mb-4" role="alert">{error}</div>}
        {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-4 py-3 mb-4" role="status">{notice}</div>}

        {/* Content */}
        {view === 'calendar' ? (
          <BookingCalendar rows={filtered} statuses={statuses} packages={packages} onSelect={b => { setSelected(b); setNotice(''); }} />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Klien</th>
                    <th className="py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Acara</th>
                    <th className="py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Layanan</th>
                    <th className="py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">DP</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map(b => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-gray-800">{b.name}</span>
                        {b.phone && <span className="block text-[10px] text-gray-400 mt-0.5">{b.phone}</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-gray-700">{b.date}</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5 max-w-[180px] truncate">{b.location}</span>
                      </td>
                      <td className="py-3.5 px-3 hidden sm:table-cell text-gray-600">{packages[b.package]}</td>
                      <td className="py-3.5 px-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-3.5 px-3 hidden sm:table-cell text-gray-600 tabular-nums">{new Intl.NumberFormat('id-ID').format(b.dp)}</td>
                      <td className="py-3.5 px-3">
                        <button onClick={() => { setSelected(b); setNotice(''); }}
                          className="text-brand-gold hover:text-brand-navy text-xs font-medium transition-colors">
                          Detail →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!displayRows.length && (
                <div className="py-16 text-center">
                  <span className="text-3xl text-brand-gold block mb-3">◇</span>
                  <h3 className="font-serif-heading text-brand-navy text-lg mb-2">Belum ada booking{view === 'agenda' ? ' mendatang' : ''}.</h3>
                  <p className="text-xs text-gray-500 mb-3">Permintaan dari formulir publik akan muncul di sini.</p>
                  <a href="/booking" className="text-xs text-brand-gold hover:text-brand-navy transition-colors">Buka formulir booking ↗</a>
                </div>
              )}
            </div>

            {/* Pagination */}
            {view === 'list' && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100">
                <button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  ← Sebelumnya
                </button>
                <span className="text-xs text-gray-400">Halaman {pagination.page} / {pagination.pages} · {pagination.total} booking</span>
                <button disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Berikutnya →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <BookingDetail
          selected={selected}
          user={user}
          onClose={() => setSelected(null)}
          onSaved={refreshAfterAction}
          onDeleted={refreshAfterAction}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }) {
  const colors = {
    baru: 'bg-blue-50 text-blue-700 border-blue-200',
    dihubungi: 'bg-violet-50 text-violet-700 border-violet-200',
    menunggu_dp: 'bg-amber-50 text-amber-700 border-amber-200',
    dp_diterima: 'bg-teal-50 text-teal-700 border-teal-200',
    dikonfirmasi: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    selesai: 'bg-gray-100 text-gray-600 border-gray-200',
    batal: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${colors[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {statuses[status]}
    </span>
  );
}
