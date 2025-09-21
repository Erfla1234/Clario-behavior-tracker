import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './providers/AppProvider';

const Login = lazy(() => import('../pages/Login').then(m => ({ default: m.Login })));
const Log = lazy(() => import('../pages/Log').then(m => ({ default: m.Log })));
const History = lazy(() => import('../pages/History').then(m => ({ default: m.History })));
const Reports = lazy(() => import('../pages/Reports').then(m => ({ default: m.Reports })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { auth, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!auth?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/log" replace />
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Login />
      </Suspense>
    )
  },
  {
    path: '/log',
    element: (
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <ProtectedRoute>
          <Log />
        </ProtectedRoute>
      </Suspense>
    )
  },
  {
    path: '/history',
    element: (
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      </Suspense>
    )
  },
  {
    path: '/reports',
    element: (
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Suspense>
    )
  }
]);