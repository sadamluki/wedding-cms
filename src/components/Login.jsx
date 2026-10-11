import React, { useState, useEffect } from 'react';
import { api } from './shared.jsx';

export function Login({ onLogin }) {
  const [setup, setSetup] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/setup').then(setSetup).catch(e => setError(e.message));
  }, []);

  return (
    <main className="flex-grow flex items-center justify-center px-4 xs:px-6 py-12 lg:py-20">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100/80">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-brand-gold uppercase block mb-4">
          PRIVATE WORKSPACE
        </span>
        <h1 className="font-serif-heading text-brand-navy font-normal text-3xl sm:text-4xl leading-tight mb-3">
          {setup?.needed ? 'Selamat datang.' : 'Senang bertemu lagi.'}
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          {setup?.needed
            ? 'Buat satu akun admin untuk mulai mengelola booking. Setup hanya tersedia dari localhost.'
            : 'Masuk untuk mengelola hari-hari istimewa klien Anda.'}
        </p>
        {setup?.needed && !setup.local ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3" role="alert">
            Buka halaman ini langsung melalui http://127.0.0.1:3100/admin di komputer server untuk setup.
          </div>
        ) : (
          setup && (
            <form
              className="space-y-4"
              onSubmit={async e => {
                e.preventDefault();
                setError('');
                const data = Object.fromEntries(new FormData(e.target));
                try {
                  if (setup.needed) {
                    await api('/setup', data);
                    setSetup({ ...setup, needed: false });
                  }
                  onLogin(await api('/login', data));
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-1.5">Username</label>
                <input id="username" name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_.-]+" autoComplete="username"
                  className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                <input id="password" name="password" type="password" required minLength={setup.needed ? 12 : 1} maxLength={200}
                  autoComplete={setup.needed ? 'new-password' : 'current-password'}
                  className="custom-input w-full px-3.5 py-2.5 text-sm rounded-lg text-gray-800 placeholder-gray-400" />
              </div>
              {setup.needed && (
                <p className="text-[11px] text-gray-400 leading-normal">Minimal 12 karakter. Simpan password di password manager Anda.</p>
              )}
              <button className="w-full bg-brand-navy hover:bg-slate-800 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 text-sm shadow-md active:scale-[0.99] touch-manipulation mt-2">
                {setup.needed ? 'Buat admin & masuk' : 'Masuk'}
              </button>
            </form>
          )
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3 mt-4" role="alert">{error}</div>
        )}
      </div>
    </main>
  );
}
