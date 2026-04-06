import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const resolveRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = resolveRole(user);
  const isAdmin = role === 'SCHOOL_ADMINISTRATOR' || role === 'SYSTEM_ADMINISTRATOR';
  const isSystemAdmin = role === 'SYSTEM_ADMINISTRATOR';
  const isSchoolAdmin = role === 'SCHOOL_ADMINISTRATOR';
  const isBureauUser = role === 'BUREAU_OF_EDUCATION' || role === 'SYSTEM_ADMINISTRATOR';
  const canUseBehaviorReports = ['TEACHER', 'SCHOOL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR', 'PARENT', 'STUDENT'].includes(role);
  const canUseProgressCenter = ['PARENT', 'TEACHER', 'SCHOOL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="top-nav">
      <div className="top-nav-brand">
        <Link to="/dashboard" className="top-nav-brand-link">
          <span className="top-nav-brand-mark">L</span>
          <span className="top-nav-brand-text">LMS Platform</span>
        </Link>
      </div>

      <div className="top-nav-links">
        {user ? (
          <>
            <span className="top-nav-welcome">Welcome, {user.name}</span>
            <NavLink to="/dashboard" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Dashboard</NavLink>
            <NavLink to="/courses" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Courses</NavLink>
            {isAdmin && (
              <NavLink to="/users-management" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Users</NavLink>
            )}
            {isSystemAdmin && (
              <NavLink to="/school-directory" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Schools</NavLink>
            )}
            {isSchoolAdmin && (
              <NavLink to="/school-admin-center" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>School Admin</NavLink>
            )}
            {isBureauUser && (
              <NavLink to="/bureau-analytics" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Bureau</NavLink>
            )}
            {canUseBehaviorReports && (
              <NavLink to="/behavior-reports" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Behavior</NavLink>
            )}
            {canUseProgressCenter && (
              <NavLink to="/progress-center" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Progress</NavLink>
            )}
            <NavLink to="/digital-library" className={({ isActive }) => `top-nav-link ${isActive ? 'is-active' : ''}`}>Library</NavLink>
            <button onClick={handleLogout} className="btn btn-danger top-nav-logout">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary top-nav-auth-btn">Login</Link>
            <Link to="/register" className="btn btn-primary top-nav-auth-btn">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
