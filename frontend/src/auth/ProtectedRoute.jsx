
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Verifying your session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const routes = {
      farmer: '/farmer',
      consumer: '/consumer',
      bulk_buyer: '/bulk-buyer',
    };

    return <Navigate to={routes[user.role] || '/login'} replace />;
  }

  return <Outlet />;
}

