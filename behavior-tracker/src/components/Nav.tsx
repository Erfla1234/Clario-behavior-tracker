import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/AppProvider';
import { RoleBadge } from './RoleBadge';

interface NavLink {
  path: string;
  label: string;
  icon?: string;
  roles: string[];
  description?: string;
}

export function Nav() {
  const { auth, logout } = useAuth();
  const location = useLocation();

  if (!auth?.user) return null;

  const allLinks: NavLink[] = [
    {
      path: '/log',
      label: 'Log Behavior',
      icon: '📝',
      roles: ['staff', 'supervisor'],
      description: 'Record new behavior observations'
    },
    {
      path: '/today',
      label: "Today's Activity",
      icon: '📋',
      roles: ['staff', 'supervisor'],
      description: 'View real-time activity feed'
    },
    {
      path: '/history',
      label: 'History',
      icon: '📊',
      roles: ['staff', 'supervisor'],
      description: 'Browse past behavior logs'
    },
    {
      path: '/bulletin',
      label: 'Bulletin Board',
      icon: '📢',
      roles: ['staff', 'supervisor'],
      description: 'Team announcements and updates'
    },
    {
      path: '/handoff',
      label: 'Shift Handoff',
      icon: '🔄',
      roles: ['staff', 'supervisor'],
      description: 'Create and view shift handoff reports'
    },
    {
      path: '/goals',
      label: 'Goals',
      icon: '🎯',
      roles: ['supervisor'],
      description: 'Track behavior goals and progress'
    },
    {
      path: '/insights',
      label: 'AI Insights',
      icon: '🧠',
      roles: ['supervisor'],
      description: 'Smart behavioral analysis and recommendations'
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: '📈',
      roles: ['supervisor'],
      description: 'Generate and export reports'
    }
  ];

  // Filter links based on user role
  const availableLinks = allLinks.filter(link =>
    auth.user && link.roles.includes(auth.user.role)
  );

  const handleRestrictedAccess = () => {
    // Show friendly message instead of harsh error
    alert('This feature is available to supervisors only. Please contact your supervisor if you need access to reports.');
  };

  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="brand-info">
          <span className="org-name">{auth.org?.name}</span>
          <div className="user-info">
            <RoleBadge role={auth.user.role} />
            <span className="user-name">{auth.user.display_name}</span>
          </div>
        </div>
      </div>

      <div className="nav-links">
        {availableLinks.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            title={link.description}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </Link>
        ))}

        {/* Show restricted items with click handler for education */}
        {auth.user.role === 'staff' && (
          <button
            onClick={handleRestrictedAccess}
            className="nav-link restricted"
            title="Supervisor access required"
          >
            <span className="nav-icon">📈</span>
            <span className="nav-label">Reports</span>
            <span className="restriction-badge">👑</span>
          </button>
        )}
      </div>

      <div className="nav-actions">
        <button onClick={logout} className="btn-logout">
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}