import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext'; // FIXED: Added ../
import { ReactNode } from 'react';

interface RoleRouteProps {
  children: ReactNode;
  role: 'CREATOR' | 'EVENTEE';
}

const RoleRoute = ({ children, role }: RoleRouteProps) => {
  const { user, loading } = useApp();

  if (loading) return null; // Wait for auth to initialize

  if (!user) {
    return <Navigate to="/auth" replace />; // Use /auth to match your App.tsx
  }

  if (user.role !== role) {
    // Redirect to the correct base path based on role
    const redirectPath = user.role === 'CREATOR' ? '/creator' : '/eventee';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;