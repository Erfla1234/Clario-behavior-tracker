import { useAuth } from '../app/providers/AppProvider';
import { Navigate } from 'react-router-dom';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
  showMessage?: boolean;
}

export function RouteGuard({
  children,
  allowedRoles,
  fallbackPath = '/log',
  showMessage = true
}: RouteGuardProps) {
  const { auth, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!auth?.user) {
    return <Navigate to="/login" replace />;
  }

  const hasPermission = allowedRoles.includes(auth.user.role);

  if (!hasPermission) {
    if (showMessage) {
      // Show a friendly access denied page instead of just redirecting
      return (
        <div className="access-denied">
          <div className="access-denied-content">
            <div className="access-denied-icon">🔒</div>
            <h2>Access Restricted</h2>
            <p>
              This feature is available to {allowedRoles.join(' and ')} roles only.
            </p>
            <p>
              Your current role: <strong>{auth.user.role}</strong>
            </p>
            <div className="access-denied-actions">
              <button
                onClick={() => window.history.back()}
                className="btn-secondary"
              >
                ← Go Back
              </button>
              <a href={fallbackPath} className="btn-primary">
                Continue to {fallbackPath === '/log' ? 'Log Entry' : 'Dashboard'}
              </a>
            </div>
            <div className="access-denied-help">
              <p>Need access? Contact your supervisor or system administrator.</p>
            </div>
          </div>
        </div>
      );
    }

    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

// Higher-order component for easy route protection
export function withRoleGuard(Component: React.ComponentType, allowedRoles: string[]) {
  return function GuardedComponent(props: any) {
    return (
      <RouteGuard allowedRoles={allowedRoles}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

// Utility component for conditional rendering based on role
interface RoleBasedProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleBasedAccess({ children, allowedRoles, fallback = null }: RoleBasedProps) {
  const { auth } = useAuth();

  if (!auth?.user || !allowedRoles.includes(auth.user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}