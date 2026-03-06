import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Manuals from './pages/Manuals';
import Checklist from './pages/Checklist';
import ServiceOrders from './pages/ServiceOrders';
import History from './pages/History';
import UserManagement from './pages/UserManagement';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/manuals" element={<Manuals />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/service-orders" element={<ServiceOrders />} />
            <Route path="/history" element={<History />} />
            <Route path="/users" element={<UserManagement />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
