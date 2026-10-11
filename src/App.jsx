import React, { useState, useEffect } from 'react';
import { api } from './components/shared.jsx';
import { Login } from './components/Login.jsx';
import { Booking } from './components/Booking.jsx';
import { Dashboard } from './components/Dashboard.jsx';

// Re-export for test compatibility
export { packages, statuses, api, Field } from './components/shared.jsx';
export { Booking } from './components/Booking.jsx';

export default function App() {
  const isAdmin = location.pathname.startsWith('/admin');
  const [user, setUser] = useState(null);

  // Auto-check session on admin page
  useEffect(() => {
    if (isAdmin) api('/me').then(setUser).catch(() => {});
  }, []);

  async function handleLogout() {
    await api('/logout', {}, 'POST', user.csrf);
    setUser(null);
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 xs:px-6 lg:px-12 py-6 lg:py-8 flex justify-between items-center">
        <a href={isAdmin ? '/admin' : '/booking'} className="flex items-center space-x-3 no-underline">
          <span className="font-serif-heading text-4xl sm:text-5xl font-normal tracking-wide text-brand-gold">X</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-bold tracking-[0.25em] text-xs sm:text-sm text-brand-navy">XAVIER</span>
            <span className="text-[8px] sm:text-[9px] tracking-[0.3em] font-medium text-brand-gold uppercase">PRO WEDDING</span>
          </div>
        </a>
        {isAdmin && user && (
          <button onClick={handleLogout}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2.5 rounded-lg transition-colors">
            Keluar · {user.username}
          </button>
        )}
      </header>

      {/* Content */}
      {isAdmin
        ? (user
            ? <Dashboard user={user} />
            : <Login onLogin={setUser} />
          )
        : <Booking />
      }

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 xs:px-6 lg:px-12 py-6 sm:py-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-3 border-t border-gray-200/60 mt-8 sm:mt-12 text-center sm:text-left">
        <div>© Xavier Pro Wedding</div>
        <div>Thoughtfully made for your special day.</div>
      </footer>
    </div>
  );
}
