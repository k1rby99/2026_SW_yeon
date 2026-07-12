import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { tokenStore } from '../api/client';

export function RequireAuth() {
  const location = useLocation();
  const isAuthenticated = !!tokenStore.getAccess();

  if (!isAuthenticated) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
