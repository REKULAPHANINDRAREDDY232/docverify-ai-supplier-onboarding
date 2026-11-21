import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Sidebar, type NavItem } from './Sidebar';

interface AppShellProps {
  title: string;
  subtitle: string;
  items: NavItem[];
  roleLabel: string;
}

export function AppShell({ title, subtitle, items, roleLabel }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={`app-shell ${menuOpen ? 'app-shell--menu-open' : ''}`}>
      <div className="app-shell__mobile-bar">
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
        <span className="role-chip">{roleLabel}</span>
      </div>

      <div id="app-sidebar" className="app-shell__sidebar">
        <Sidebar title={title} subtitle={subtitle} items={items} />
      </div>

      <div className="app-shell__main">
        <header className="topbar">
          <p className="topbar__context">Supplier onboarding workspace</p>
          <div className="topbar__actions">
            <span className="role-chip role-chip--desktop">{roleLabel}</span>
            {user ? <span className="topbar__user">{user.name}</span> : null}
            <button
              type="button"
              className="button button--secondary"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  );
}
