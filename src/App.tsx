import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ControlPanel = lazy(() => import('./pages/ControlPanel'));
const Manuals = lazy(() => import('./pages/Manuals'));
const Checklist = lazy(() => import('./pages/Checklist'));
const ChecklistHistory = lazy(() => import('./pages/ChecklistHistory'));
const ServiceOrders = lazy(() => import('./pages/ServiceOrders'));
const History = lazy(() => import('./pages/History'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Carregando...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/control-panel" element={<ControlPanel />} />
              <Route path="/manuals" element={<Manuals />} />
              <Route path="/checklist" element={<Checklist />} />
              <Route path="/checklist-history" element={<ChecklistHistory />} />
              <Route path="/service-orders" element={<ServiceOrders />} />
              <Route path="/history" element={<History />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/audit" element={<AuditLogs />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
