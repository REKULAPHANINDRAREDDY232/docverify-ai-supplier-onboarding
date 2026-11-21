import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../types/domain';
import { useAuth } from './AuthContext';
import { defaultPathForRole } from './paths';

interface ProtectedRouteProps {
  roles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        Restoring session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={defaultPathForRole(user.role)} replace />;
  }

  return children;
}
