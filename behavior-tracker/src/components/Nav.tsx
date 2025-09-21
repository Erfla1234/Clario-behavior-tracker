import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/AppProvider';
import { RoleBadge } from './RoleBadge';

export function Nav() {
  const { auth, logout } = useAuth();
  const location = useLocation();

  if (!auth?.user) return null;

  const links = [
    { path: '/log', label: 'Log Entry' },
    { path: '/history', label: 'History' },
    { path: '/reports', label: 'Reports' }
  ];

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span>{auth.org?.name}</span>
        <RoleBadge role={auth.user.role} />
      </div>

      <div className="nav-links">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="nav-user">
        <span>{auth.user.display_name}</span>
        <button onClick={logout} className="btn-secondary">
          Logout
        </button>
      </div>
    </nav>
  );
}