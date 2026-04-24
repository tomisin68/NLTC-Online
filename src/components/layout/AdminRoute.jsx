import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminRoute() {
  const { currentUser, userData, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}><div className="spinner" /></div>;
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (userData && userData.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
