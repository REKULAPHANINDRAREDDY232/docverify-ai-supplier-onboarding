import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, type NavItem } from './Sidebar';

interface AppShellProps {
  title: string;
  subtitle: string;
  items: NavItem[];
  roleLabel: string;
}

export function AppShell({ title, subtitle, items, roleLabel }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <span className="role-chip role-chip--desktop">{roleLabel}</span>
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
