import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
  { path: '/dashboard', label: 'Dashboard', end: true },
  { path: '/customers/new', label: 'Add Customer', end: true },
  { path: '/customers', label: 'Customer List', end: true },
  { path: '/analytics', label: 'Analytics', end: true },
];

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const navContent = (
    <>
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50 mb-0.5">Tailor Management</p>
          <h1 className="text-base font-semibold tracking-wide text-white">Vishwas Tailor</h1>
        </div>
        <button
          className="md:hidden text-white/60 text-2xl leading-none"
          onClick={() => setMobileOpen(false)}
        >
          ×
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 mt-1">
        {links.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-md transition text-sm ${
                isActive
                  ? 'bg-white text-primary font-semibold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white/90 rounded-md text-sm font-medium transition"
        >
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        className="md:hidden fixed top-3 right-3 z-50 bg-primary text-white p-2 rounded-md"
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-60 bg-primary text-white flex flex-col transform transition-transform ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {navContent}
      </aside>

      <aside className="hidden md:flex w-52 bg-primary text-white min-h-screen flex-col">
        {navContent}
      </aside>
    </>
  );
}