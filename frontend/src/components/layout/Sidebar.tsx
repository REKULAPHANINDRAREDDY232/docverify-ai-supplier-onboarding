import { NavLink } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface SidebarProps {
  title: string;
  subtitle: string;
  items: NavItem[];
}

export function Sidebar({ title, subtitle, items }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <p className="sidebar__eyebrow">DocVerify AI</p>
        <h1 className="sidebar__title">{title}</h1>
        <p className="sidebar__subtitle">{subtitle}</p>
      </div>
      <nav className="sidebar__nav" aria-label="Primary">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
