import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasModuleAccess, isAdminUser } from '../lib/permissions';

const routeModuleByPrefix: Array<{ prefix: string; moduleId: number | 'admin-only' }> = [
  { prefix: '/control-panel', moduleId: 8 },
  { prefix: '/manuals', moduleId: 1 },
  { prefix: '/checklist-history', moduleId: 6 },
  { prefix: '/checklist', moduleId: 2 },
  { prefix: '/service-orders', moduleId: 3 },
  { prefix: '/history', moduleId: 4 },
  { prefix: '/users', moduleId: 'admin-only' },
  { prefix: '/audit', moduleId: 'admin-only' },
];

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = isAdminUser(user);

  const matchedRoute = routeModuleByPrefix.find((item) =>
    location.pathname === item.prefix || location.pathname.startsWith(`${item.prefix}/`)
  );

  if (!matchedRoute || isAdmin) {
    return <Outlet />;
  }

  if (matchedRoute.moduleId === 'admin-only') {
    return <Navigate to="/" replace />;
  }

  const userHasModuleAccess = hasModuleAccess(user, matchedRoute.moduleId);
  if (!userHasModuleAccess) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
