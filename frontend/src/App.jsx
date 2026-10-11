import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewComplaint from './pages/NewComplaint';
import Feed from './pages/Feed';
import ComplaintDetail from './pages/ComplaintDetail';
import Analytics from './pages/Analytics';
import { useAuth } from './context/AuthContext';

function Shell({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
        <Route path="/feed" element={<Shell><Feed /></Shell>} />
        <Route path="/complaints/:id" element={<Shell><ComplaintDetail /></Shell>} />
      </Route>

      <Route element={<ProtectedRoute roles={['student']} />}>
        <Route path="/new" element={<Shell><NewComplaint /></Shell>} />
      </Route>

      <Route element={<ProtectedRoute roles={['admin', 'hod']} />}>
        <Route path="/analytics" element={<Shell><Analytics /></Shell>} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
