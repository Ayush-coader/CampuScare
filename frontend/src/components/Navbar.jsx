import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isManager = ['admin', 'hod'].includes(user.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">C</span>CampusCare
        </Link>

        <nav className="nav-links">
          <NavLink to="/dashboard">{user.role === 'student' ? 'My complaints' : 'Complaints'}</NavLink>
          <NavLink to="/feed">Campus feed</NavLink>
          {user.role === 'student' && <NavLink to="/new">Report a problem</NavLink>}
          {isManager && <NavLink to="/analytics">Analytics</NavLink>}
        </nav>

        <div className="nav-user">
          <span className="who">
            <strong>{user.name}</strong>
          </span>
          <span className="role-chip">{user.role === 'hod' ? 'HOD' : user.role}</span>
          <button className="btn sm secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
