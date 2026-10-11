import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// <ProtectedRoute /> requires login; <ProtectedRoute roles={['admin']} /> also checks the role
export default function ProtectedRoute({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
