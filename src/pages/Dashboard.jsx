import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// --- Utility: derive a clean role label from the user object ---
const getRoleLabel = (user) => {
  if (!user) return 'User';
  if (user.legacyRole) {
    return user.legacyRole.replace(/_/g, ' ');
  }
  if (user.roles && user.roles.length > 0) return user.roles[0].name;
  return 'User';
};

// --- SVG Icon Components ---
const Icon = ({ d, size = 20, color = 'currentColor', strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  book:    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  bell:    "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  award:   "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  clock:   "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  arrow:   "M5 12h14M12 5l7 7-7 7",
  check:   "M20 6L9 17l-5-5",
  plus:    "M12 5v14M5 12h14",
  logout:  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  profile: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  home:    "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  grad:    "M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3 3 9 3 12 0v-5",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  cpu:     "M12 2V6M12 18V22M6 12H2M22 12H18M18 18L15.5 15.5M18 6L15.5 8.5M6 18L8.5 15.5M6 6L8.5 8.5",
  sun:     "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  moon:    "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
};

// --- Stat Card ---
const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
  <div className="dashboard-card-elevated" style={{
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{title}</p>
        <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0' }}>{value}</h3>
      </div>
      <div className="stat-pill" style={{
        background: `${color}11`,
        color: color,
      }}>
        <Icon d={icon} size={24} color={color} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
      {trend && (
        <span style={{ 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          color: trend > 0 ? '#10b981' : '#ef4444',
          background: trend > 0 ? '#f0fdf4' : '#fef2f2',
          padding: '0.2rem 0.6rem',
          borderRadius: '99px'
        }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>{subtitle}</p>
    </div>
  </div>
);

// --- Course Card ---
const CourseCard = ({ course }) => (
  <Link to={`/courses/${encodeURIComponent(course.courseName || course.title || course.name)}`} style={{ textDecoration: 'none' }}>
    <div className="dashboard-card-elevated" style={{
      padding: '0',
      overflow: 'hidden',
      display: 'flex', 
      flexDirection: 'column',
    }}>
      {/* Thumbnail / Header Area */}
      <div style={{
        height: '140px',
        background: `linear-gradient(135deg, ${['#0e7490', '#4338ca', '#7c3aed', '#db2777'][Math.floor(Math.random() * 4)]}, var(--text-primary))`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.2)',
      }}>
        <Icon d={icons.book} size={48} />
        <div style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
          padding: '0.25rem 0.75rem', borderRadius: '20px', color: '#fff',
          fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {(course.courseDuration || course.duration) ? `${course.courseDuration || course.duration}h` : 'Course'}
        </div>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
          {course.courseName || course.title || course.name || 'Untitled Course'}
        </h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
          {(course.courseDescription || course.description)?.slice(0, 75) || 'Begin your medical education journey with this structured curriculum.'}...
        </p>
        
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Icon d={icons.profile} size={12} color="var(--text-secondary)" />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{course.instructorName || 'Academy Expert'}</span>
          </div>
          <span style={{ color: '#0ea5a8', fontSize: '0.8rem', fontWeight: 800 }}>Explore →</span>
        </div>
      </div>
    </div>
  </Link>
);

// --- Notification Item ---
const NotifItem = ({ notif }) => (
  <div style={{
    display: 'flex', gap: '1rem', alignItems: 'center',
    padding: '1rem', borderRadius: '16px', transition: 'all 0.2s',
    cursor: 'pointer'
  }}
    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{
      width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
      background: 'linear-gradient(135deg, #f59e0b22, #f59e0b44)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon d={icons.bell} size={18} color="#d97706" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {notif.message || notif.content || 'System Notification'}
      </p>
      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
      </p>
    </div>
    <Icon d={icons.arrow} size={14} color="#e2e8f0" />
  </div>
);

// --- Theme Toggle ---
const ThemeToggle = ({ isCollapsed }) => {
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button 
      onClick={toggleTheme}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.72rem',
        width: '100%', padding: '0.65rem 0.72rem', borderRadius: '12px',
        border: '1px solid transparent', background: 'transparent',
        color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
        marginTop: '0.25rem'
      }}
      className="theme-toggle-btn"
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(14, 165, 168, 0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d={theme === 'light' ? icons.moon : icons.sun} size={18} color="var(--primary)" />
      </div>
      {!isCollapsed && (
        <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

// --- Generic Section Panel (The "Modular UI" Wrapper) ---
const DashboardPanel = ({ title, actionLabel, onAction, children, icon, iconColor }) => (
  <div className="dashboard-card-elevated" style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={{ 
      padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {icon && (
          <div style={{ 
            width: 32, height: 32, borderRadius: '10px', 
            background: `${iconColor}11`, display: 'flex', 
            alignItems: 'center', justifyContent: 'center' 
          }}>
            <Icon d={icon} size={16} color={iconColor} />
          </div>
        )}
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      {actionLabel && (
        <button 
          onClick={onAction} 
          style={{ 
            background: 'transparent', color: '#0ea5a8', border: 'none', 
            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
            padding: '0.4rem 0.75rem', borderRadius: '8px', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0ea5a811'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {actionLabel}
        </button>
      )}
    </div>
    <div style={{ padding: '1.25rem 1rem' }}>
      {children}
    </div>
  </div>
);

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const { user, logout } = useAuth();
  const MOBILE_BREAKPOINT = 1024;
  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [myProgress, setMyProgress] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  ));
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth > MOBILE_BREAKPOINT : true
  ));

  const role = getRoleLabel(user);
  const isAdmin = role.includes('ADMIN') || role.includes('SYSTEM');
  const isInstructor = role.includes('INSTRUCTOR') || role.includes('TEACHER');
  const isStudent = role.includes('STUDENT');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [myCourses, allC, notifs, progress, insights] = await Promise.allSettled([
          axios.get('/api/course/get-my-courses'),
          axios.get('/api/course/get-all-courses'),
          axios.get('/api/users/notifications'),
          isStudent ? axios.get('/api/progress/me') : Promise.resolve({ data: null }),
          (isAdmin || isInstructor) ? axios.get('/api/ai-insights/school') : Promise.resolve({ data: [] })
        ]);
        if (myCourses.status === 'fulfilled' && Array.isArray(myCourses.value.data)) {
          setCourses(myCourses.value.data);
        }
        if (allC.status === 'fulfilled' && Array.isArray(allC.value.data)) {
          setAllCourses(allC.value.data);
        }
        if (notifs.status === 'fulfilled' && Array.isArray(notifs.value.data)) {
          setNotifications(notifs.value.data);
        }
        if (progress.status === 'fulfilled' && progress.value.data) {
          setMyProgress(progress.value.data);
        }
        if (insights.status === 'fulfilled' && Array.isArray(insights.value.data)) {
          setAiInsights(insights.value.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const stats = [
    { title: isAdmin ? 'Total Courses' : 'My Courses', value: isAdmin ? allCourses.length : courses.length, icon: icons.book, color: '#6366f1', subtitle: 'Active courses', trend: 12 },
    { title: 'Total Courses', value: allCourses.length, icon: icons.grad, color: '#ec4899', subtitle: 'On the platform', trend: 8 },
    { title: 'Notifications', value: notifications.length, icon: icons.bell, color: '#f59e0b', subtitle: 'Unread alerts' },
    { title: 'Role', value: isAdmin ? 'Admin' : isInstructor ? 'Instructor' : 'Student', icon: icons.shield, color: '#10b981', subtitle: `${user?.name || ''}` },
  ];

  const sidebarLinks = [
    { key: 'overview', icon: icons.home, label: 'Overview' },
    { key: 'courses', icon: icons.book, label: isAdmin ? 'All Courses' : 'My Courses', badge: courses.length },
    { key: 'browse', icon: icons.grad, label: 'Browse Courses', badge: allCourses.length },
    { key: 'notifications', icon: icons.bell, label: 'Notifications', badge: notifications.length },
    ...(isInstructor ? [{ key: 'management', icon: icons.shield, label: 'Manage Courses', to: '/management' }] : []),
    ...(isInstructor ? [{ key: 'monitoring', icon: icons.users, label: 'Student Progress', to: '/student-monitoring' }] : []),
    ...(isAdmin || isInstructor ? [{ key: 'ai', icon: icons.cpu || icons.shield, label: 'AI Insights', to: '/ai-insights' }] : []),
    ...(isAdmin ? [{ key: 'rbac', icon: icons.shield, label: 'RBAC Control', to: '/rbac-management' }] : []),
    ...(isStudent ? [{ key: 'progress', icon: icons.chart, label: 'My Progress' }] : []),
  ];

  const handleSectionChange = (sectionKey) => {
    setActiveSection(sectionKey);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Modify sidebar nav item to support 'to' prop
  const NavItemWithLink = ({ icon, label, active, onClick, badge, to }) => {
    const content = (
      <button
        onClick={onClick}
        className={`dashboard-side-item ${active ? 'is-active' : ''}`}
      >
        <span className="dashboard-side-icon">
          <Icon d={icon} size={18} color={active ? 'var(--text-primary)' : '#4c6a85'} />
        </span>
        {label && <span className="dashboard-side-label">{label}</span>}
        {badge > 0 && (
          <span className={`dashboard-side-badge ${sidebarOpen ? '' : 'is-dot'}`}>
            {sidebarOpen ? badge : ''}
          </span>
        )}
      </button>
    );

    if (to) return <Link to={to} className="dashboard-side-link">{content}</Link>;
    return content;
  };

  // -------- SIDEBAR --------
  const Sidebar = () => (
    <aside className={`dashboard-sidebar glass-sidebar ${sidebarOpen ? 'is-open' : 'is-collapsed'} ${isMobile ? 'is-mobile' : ''}`}>
      {/* Scrollable Container */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Logo */}
        <div style={{ padding: '0.5rem 0.85rem' }}>
          <div className="dashboard-sidebar-brand" style={{ margin: 0 }}>
            <div className="dashboard-sidebar-brand-mark" style={{ borderRadius: '14px', width: 42, height: 42 }}>
              <Icon d={icons.grad} size={22} color="white" />
            </div>
            {sidebarOpen && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="dashboard-sidebar-brand-text" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>LMS</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginTop: -3 }}>Academy Hub</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu Sections */}
        <div className="dashboard-sidebar-menu" style={{ padding: '0 0.5rem' }}>
          <p style={{ 
            fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', 
            padding: '0 0.85rem', marginBottom: '0.5rem', display: sidebarOpen ? 'block' : 'none'
          }}>Menu</p>
          {sidebarLinks.map(l => (
            <NavItemWithLink
              key={l.key}
              icon={l.icon}
              label={sidebarOpen ? l.label : ''}
              badge={l.badge}
              active={activeSection === l.key}
              onClick={() => handleSectionChange(l.key)}
              to={l.to}
            />
          ))}

          {/* Quick Section */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ 
              fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', 
              padding: '0 0.85rem', marginBottom: '0.5rem', display: sidebarOpen ? 'block' : 'none'
            }}>Quick Links</p>
            <Link
              to="/courses"
              className="dashboard-side-link"
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <div className="dashboard-side-item">
                <span className="dashboard-side-icon"><Icon d={icons.arrow} size={18} /></span>
                {sidebarOpen && 'Course Catalog'}
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '0 0.5rem 1rem' }}>
          <div className="dashboard-sidebar-footer" style={{ border: 'none', background: 'var(--surface-color)', borderRadius: '16px', padding: '0.75rem' }}>
            <ThemeToggle isCollapsed={!sidebarOpen} />
            <div className="dashboard-sidebar-user" style={{ padding: 0, marginTop: '0.5rem' }}>
              <div className="dashboard-sidebar-user-avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="dashboard-sidebar-user-meta">
                  <p style={{ fontSize: '0.8rem' }}>{user?.name}</p>
                  <small style={{ fontSize: '0.6rem' }}>{role}</small>
                </div>
              )}
            </div>
            <button onClick={logout} className="dashboard-sidebar-logout" style={{ 
              padding: '0.6rem 0.75rem', marginTop: '0.5rem', borderRadius: '10px', width: '100%' 
            }}>
              <Icon d={icons.logout} size={18} />
              {sidebarOpen && 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  // -------- RENDER SECTION --------
  const renderSection = () => {
    switch (activeSection) {
      case 'notifications':
        return (
          <div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Notifications</h2>
            <div style={{ background: 'var(--surface-color)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                  <Icon d={icons.bell} size={40} color="#cbd5e1" />
                  <p style={{ marginTop: '1rem' }}>No notifications yet</p>
                </div>
              ) : notifications.map((n, i) => <NotifItem key={i} notif={n} />)}
            </div>
          </div>
        );

      case 'courses':
      case 'browse': {
        const list = activeSection === 'browse' ? allCourses : courses;
        const title = activeSection === 'browse' ? 'Browse All Courses' : (isAdmin ? 'All Courses' : 'My Courses');
        return (
          <div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>{title}</h2>
            {list.length === 0 ? (
              <div style={{ background: 'var(--surface-color)', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <Icon d={icons.book} size={48} color="#cbd5e1" />
                <p style={{ marginTop: '1rem' }}>No courses found</p>
                <Link to="/courses" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Explore Courses</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {list.map((c, i) => <CourseCard key={c.id || i} course={c} />)}
              </div>
            )}
          </div>
        );
      }
      case 'progress':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Learning Progress</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {(myProgress?.courseProgress || courses).map((c, i) => (
                <div key={i} style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                     <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{c.courseName || c.title || c.name}</h3>
                     <Link to={`/courses/${encodeURIComponent(c.courseName || c.title || c.name)}`} style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600 }}>View Lessons</Link>
                  </div>
                  
                  {/* Progress Bar */}
                  {c.totalLessons > 0 ? (
                    <>
                      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ 
                          width: `${(c.attendedLessons / c.totalLessons) * 100}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', 
                          borderRadius: '4px' 
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Lessons: {c.attendedLessons}/{c.totalLessons}</span>
                        <span style={{ fontWeight: 700, color: '#6366f1' }}>{Math.round((c.attendedLessons/c.totalLessons)*100)}%</span>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No lessons tracked yet.</p>
                  )}

                  {/* Assignments */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assignments</span>
                     <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.submittedAssignments || 0} / {c.totalAssignments || 0}</span>
                  </div>
                </div>
              ))}
            </div>
            {courses.length === 0 && (
              <div style={{ background: 'var(--surface-color)', borderRadius: '16px', padding: '4rem', textAlign: 'center', border: '1px solid var(--surface-border)' }}>
                <Icon d={icons.chart} size={48} color="#cbd5e1" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Enroll in a course to see your progress here.</p>
                <button onClick={() => setActiveSection('browse')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Courses</button>
              </div>
            )}
          </div>
        );

      default: // overview
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Welcome Banner */}
            <div className="hero-banner">
              <div style={{ maxWidth: '540px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <span style={{ 
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', 
                    padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.75rem', 
                    fontWeight: 800, letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.2)' 
                  }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 1rem', fontSize: '2.75rem', fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>
                  Welcome back,<br /> {user?.name?.split(' ')[0]}
                </h2>
                <p style={{ margin: 0, fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontWeight: 500 }}>
                  {isAdmin ? 'System wide administrative controls enabled. Monitor platform health and AI insights below.' : 
                   isInstructor ? 'Your students are active! Review today\'s performance metrics and course engagement.' : 
                   'Ready to continue your journey?'}
                </p>
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                   <button onClick={() => setActiveSection('courses')} className="btn" style={{ background: 'var(--surface-color)', color: 'var(--text-primary)', fontWeight: 800, padding: '0.85rem 2rem' }}>My Learning</button>
                   <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, padding: '0.85rem 2rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>Platform Guide</button>
                </div>
              </div>
              
              {/* Glass Stats on Banner */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '220px' }}>
                {[
                  { label: 'Active Progress', val: '78%' },
                  { label: 'Points Earned', val: '1,240' }
                ].map((s, i) => (
                  <div key={i} style={{ 
                    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(15px)', 
                    padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>{s.label}</p>
                    <h4 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{s.val}</h4>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {stats.map((s, i) => <StatCard key={i} {...s} />)}
            </div>

            {/* AI Insights Summary */}
            {aiInsights.length > 0 && (
              <div style={{ 
                background: 'linear-gradient(135deg, #fff1f2, #fff)', 
                borderRadius: '24px', 
                padding: '1.25rem 2rem', 
                border: '1px solid #fee2e2', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: '0 10px 15px -3px rgba(153, 27, 27, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ background: '#ef4444', color: 'white', borderRadius: '14px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.25)' }}>
                    <Icon d={icons.cpu} size={20} color="white" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#991b1b' }}>AI Security Sentinel: {aiInsights.filter(i => i.riskLevel === 'HIGH').length} Critical Risk Indicators</h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: '#b91c1c', fontWeight: 500 }}>{aiInsights[0]?.summary}</p>
                  </div>
                </div>
                <Link to="/ai-insights" className="btn" style={{ background: '#ef4444', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 800 }}>Resolve Issues</Link>
              </div>
            )}
            {/* Bottom Panels (Redesigned Modular UI) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* My Courses panel */}
              <DashboardPanel 
                title={isAdmin ? 'All Courses' : 'My Courses'} 
                actionLabel="View All" 
                onAction={() => setActiveSection('courses')}
                icon={icons.book}
                iconColor="#4338ca"
              >
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading workspace…</div>
                ) : courses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Icon d={icons.book} size={40} color="#e2e8f0" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No courses active</p>
                    <Link to="/courses" style={{ color: '#0ea5a8', fontWeight: 800, fontSize: '0.8rem' }}>Browse curriculum →</Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {courses.slice(0, 4).map((c, i) => (
                      <div key={i} style={{ 
                        display: 'flex', gap: '1rem', alignItems: 'center', 
                        padding: '0.75rem', borderRadius: '12px', transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                          background: `linear-gradient(135deg, hsl(${(i * 55 + 210) % 360}, 70%, 94%), hsl(${(i * 55 + 210) % 360}, 70%, 88%))`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: `hsl(${(i * 55 + 210) % 360}, 60%, 45%)`, fontWeight: 900, fontSize: '1rem',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                        }}>
                          {(c.title || c.name || 'C')[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.title || c.name || 'Course'}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                             {c.duration ? `${c.duration} hours` : 'Learning in progress'}
                          </p>
                        </div>
                        <Link to={`/courses/${encodeURIComponent(c.courseName || c.title || c.name)}`}>
                          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--surface-color)' }}>
                            <Icon d={icons.arrow} size={16} color="#cbd5e1" />
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardPanel>

              {/* Notifications panel */}
              <DashboardPanel 
                title="Recent Alerts" 
                actionLabel="View All" 
                onAction={() => setActiveSection('notifications')}
                icon={icons.bell}
                iconColor="#f59e0b"
              >
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Fetching alerts…</div>
                ) : notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Icon d={icons.bell} size={40} color="#e2e8f0" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Workspace clear</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {notifications.slice(0, 5).map((n, i) => <NotifItem key={i} notif={n} />)}
                  </div>
                )}
              </DashboardPanel>

              {/* Quick Actions Grid */}
              <DashboardPanel 
                title="Quick Access" 
                icon={icons.plus}
                iconColor="#0ea5a8"
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                   {[
                    { label: 'Browse', icon: icons.book, color: '#4338ca', bg: '#e0e7ff', onClick: () => setActiveSection('browse') },
                    { label: 'Alerts', icon: icons.bell, color: '#d97706', bg: '#ffedd5', onClick: () => setActiveSection('notifications') },
                    ...(isInstructor ? [
                      { label: 'Create', icon: icons.plus, color: '#7c3aed', bg: '#f3e8ff', to: '/management' },
                      { label: 'Manage', icon: icons.shield, color: '#db2777', bg: '#fce7f3', to: '/management' }
                    ] : []),
                    ...(isStudent ? [
                      { label: 'Progress', icon: icons.chart, color: '#0e7490', bg: '#ecfeff', onClick: () => setActiveSection('progress') }
                    ] : []),
                    { label: 'Catalog', icon: icons.grad, color: '#10b981', bg: '#d1fae5', to: '/courses' },
                    { label: 'Profile', icon: icons.profile, color: 'var(--text-secondary)', bg: '#f1f5f9', onClick: () => {} },
                  ].map((a, i) => {
                    const ActionBox = (
                      <div key={i} onClick={a.onClick} style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', 
                        justifyContent: 'center', gap: '0.65rem', padding: '1.25rem 0.5rem', 
                        borderRadius: '16px', background: a.bg, cursor: 'pointer', 
                        transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid rgba(0,0,0,0.02)'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ 
                          width: 36, height: 36, borderRadius: '10px', 
                          background: 'var(--surface-color)', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' 
                        }}>
                          <Icon d={a.icon} size={18} color={a.color} />
                        </div>
                        <span style={{ fontWeight: 800, color: a.color, fontSize: '0.75rem', letterSpacing: '0.02em' }}>{a.label}</span>
                      </div>
                    );
                    return a.to ? <Link to={a.to} key={i} style={{ textDecoration: 'none' }}>{ActionBox}</Link> : ActionBox;
                  })}
                </div>
              </DashboardPanel>

            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-shell" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="dashboard-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <Sidebar />

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="dashboard-sidebar-toggle"
        style={{ left: isMobile ? 12 : (sidebarOpen ? 236 : 52) }}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isMobile ? (sidebarOpen ? '✕' : '☰') : (sidebarOpen ? '◀' : '▶')}
      </button>

      {/* Main Content */}
      <main className="dashboard-main" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 272 : 88) }}>
        {/* Persistent Dashboard Header */}
        <header style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          marginBottom: '2.5rem', padding: '0.5rem 0'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {activeSection === 'overview' ? 'Overview' :
                activeSection === 'courses' ? 'Academy' :
                activeSection === 'browse' ? 'Curriculum' : 'Notifications'}
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
               {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {role}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', display: isMobile ? 'none' : 'block' }}>
               <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                 <Icon d={icons.search} size={18} />
               </span>
               <input 
                 type="text" 
                 placeholder="Search workspace..." 
                 style={{ 
                   background: 'var(--surface-color)', border: '1px solid var(--surface-border)', borderRadius: '12px',
                   padding: '0.65rem 1rem 0.65rem 2.75rem', width: '260px', outline: 'none',
                   fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.3s'
                 }}
                 className="premium-input"
               />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => setActiveSection('notifications')} style={{
                width: 44, height: 44, borderRadius: '12px', border: '1px solid var(--surface-border)',
                background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', transition: 'all 0.3s'
              }} className="dashboard-card-elevated">
                <Icon d={icons.bell} size={20} color="var(--text-secondary)" />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, width: 10, height: 10,
                    background: '#ef4444', borderRadius: '50%', border: '2px solid white',
                  }} />
                )}
              </button>
              
              {/* Profile Block */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                background: 'var(--surface-color)', borderRadius: '14px', padding: '0.4rem 1rem 0.4rem 0.5rem',
                border: '1px solid var(--surface-border)', cursor: 'pointer'
              }} className="dashboard-card-elevated">
                <div style={{
                  width: 34, height: 34, borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0e7490, #4338ca)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: '0.8rem',
                }}>{user?.name?.[0]?.toUpperCase()}</div>
                <div style={{ display: isMobile ? 'none' : 'block' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{user?.name}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {renderSection()}
      </main>
    </div>
  );
}
