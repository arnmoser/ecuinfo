import { Link, NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/landing', label: 'Home' },
  { to: '/app', label: 'App' },
  { to: '/remarketing', label: 'Planos' },
  { to: '/terms', label: 'Termos' },
  { to: '/privacy', label: 'Privacidade' }
];

export function AppShell() {
  return (
    <div className="shell">
      <header className="shell-header">
        <Link className="brand" to="/landing">
          ECU Info
        </Link>
        <nav className="shell-nav">
          {links.map((link) => (
            <NavLink key={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="shell-content">
        <Outlet />
      </main>
    </div>
  );
}
