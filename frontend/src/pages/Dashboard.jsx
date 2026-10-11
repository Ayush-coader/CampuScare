import { useAuth } from '../context/AuthContext';
import StudentDashboard from './StudentDashboard';
import ManagerDashboard from './ManagerDashboard';

// Students see their own complaints; staff / admin / HOD get the management table
export default function Dashboard() {
  const { user } = useAuth();
  return user.role === 'student' ? <StudentDashboard /> : <ManagerDashboard />;
}
