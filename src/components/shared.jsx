import React from 'react';

/** WIB date helper (UTC+7) — used for date minimum in booking forms */
export function todayWIB() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

export const packages = {
  makeup: 'Makeup',
  makeup_dekor: 'Makeup & Dekor',
  dekor: 'Dekorasi',
  custom: 'Custom',
};

export const statuses = {
  baru: 'Baru',
  dihubungi: 'Dihubungi',
  menunggu_dp: 'Menunggu DP',
  dp_diterima: 'DP diterima',
  dikonfirmasi: 'Dikonfirmasi',
  selesai: 'Selesai',
  batal: 'Batal',
};

export async function api(path, body, method = 'POST', csrf) {
  const r = await fetch('/api' + path, {
    method: body ? method : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || 'Permintaan gagal.');
  return data;
}

export async function apiUpload(path, file, csrf) {
  const fd = new FormData();
  fd.append('proof', file);
  const r = await fetch('/api' + path, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: fd,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || 'Upload gagal.');
  return data;
}

export async function apiDelete(path, csrf) {
  const r = await fetch('/api' + path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || 'Penghapusan gagal.');
  return data;
}

export function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

export function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}
