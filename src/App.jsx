import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CBTPage from './pages/CBTPage';
import AdminPage from './pages/AdminPage';
import LivestreamPage from './pages/LivestreamPage';
import NotificationsPage from './pages/NotificationsPage';
import PaymentResultPage from './pages/PaymentResultPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute';
import Toast from './components/ui/Toast';

export default function App() {
  return (
    <>
      <Toast />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/cbt" element={<CBTPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/livestream/:sessionId" element={<LivestreamPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
