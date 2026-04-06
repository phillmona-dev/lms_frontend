import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bell, ChartBar, Megaphone, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const audienceOptions = [
  'ALL',
  'STUDENT',
  'TEACHER',
  'PARENT',
  'SCHOOL_ADMINISTRATOR',
  'SYSTEM_ADMINISTRATOR',
  'BUREAU_OF_EDUCATION',
  'AI_SYSTEM',
  'AUTHENTICATION_SYSTEM',
];

const getRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';
const formatRoleLabel = (value) => String(value || 'USER').replaceAll('_', ' ');
const formatAudienceLabel = (value) => String(value || 'ALL').replaceAll('_', ' ');

const resolveStudentRisk = (student) => {
  const harmfulCount = Number(student?.harmfulContentReportCount || 0);
  const behaviorCount = Number(student?.behaviorReportCount || 0);
  const overall = Number(student?.overallProgressRate || 0);
  const attendance = Number(student?.attendanceRate || 0);

  if (harmfulCount > 0 || behaviorCount >= 4 || overall < 45 || attendance < 55) {
    return 'HIGH';
  }
  if (behaviorCount >= 2 || overall < 65 || attendance < 70) {
    return 'MEDIUM';
  }
  return 'LOW';
};

const riskWeight = (student) => {
  const risk = resolveStudentRisk(student);
  if (risk === 'HIGH') return 3;
  if (risk === 'MEDIUM') return 2;
  return 1;
};

const StatCard = ({ title, value, subtitle, icon }) => (
  <div className="admin-stat-card">
    <div className="admin-stat-icon">{icon}</div>
    <div>
      <p>{title}</p>
      <h3>{value}</h3>
      {subtitle && <span>{subtitle}</span>}
    </div>
  </div>
);

export default function SchoolAdminCenter() {
  const { user } = useAuth();
  const role = getRole(user);
  const isSchoolAdmin = role === 'SCHOOL_ADMINISTRATOR';

  const [dashboard, setDashboard] = useState(null);
  const [studentReports, setStudentReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentRiskFilter, setStudentRiskFilter] = useState('ALL');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementAudienceFilter, setAnnouncementAudienceFilter] = useState('ANY');

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    audience: 'ALL',
  });

  const fetchAdminData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const [dashboardRes, reportsRes, announcementsRes] = await Promise.allSettled([
        axios.get('/api/school-admin/dashboard'),
        axios.get('/api/school-admin/reports/students'),
        axios.get('/api/school-admin/announcements'),
      ]);

      if (dashboardRes.status === 'fulfilled') {
        setDashboard(dashboardRes.value.data);
      } else {
        const msg = dashboardRes.reason?.response?.data?.message || dashboardRes.reason?.response?.data || 'Failed to load dashboard.';
        setMessage({ type: 'error', text: String(msg) });
      }

      if (reportsRes.status === 'fulfilled') {
        setStudentReports(Array.isArray(reportsRes.value.data) ? reportsRes.value.data : []);
      }

      if (announcementsRes.status === 'fulfilled') {
        setAnnouncements(Array.isArray(announcementsRes.value.data) ? announcementsRes.value.data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSchoolAdmin) {
      setLoading(false);
      return;
    }
    fetchAdminData();
  }, [isSchoolAdmin]);

  const sortedReports = useMemo(
    () => [...studentReports].sort((a, b) => {
      const riskDiff = riskWeight(b) - riskWeight(a);
      if (riskDiff !== 0) {
        return riskDiff;
      }
      return (a.overallProgressRate || 0) - (b.overallProgressRate || 0);
    }),
    [studentReports],
  );

  const filteredReports = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return sortedReports.filter((student) => {
      const risk = resolveStudentRisk(student);
      const matchesRisk = studentRiskFilter === 'ALL' || studentRiskFilter === risk;
      if (!matchesRisk) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [student.studentName, student.studentEmail, student.studentId]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [sortedReports, studentSearch, studentRiskFilter]);

  const announcementAudienceFilters = useMemo(() => {
    const audiences = Array.from(new Set(announcements.map((item) => item.audience).filter(Boolean)));
    return ['ANY', ...audiences];
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const query = announcementSearch.trim().toLowerCase();
    return announcements.filter((announcement) => {
      const matchesAudience = announcementAudienceFilter === 'ANY' || announcement.audience === announcementAudienceFilter;
      if (!matchesAudience) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [announcement.title, announcement.message, announcement.createdByName, announcement.audience]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [announcements, announcementAudienceFilter, announcementSearch]);

  const roleLabel = formatRoleLabel(role);
  const highRiskCount = useMemo(
    () => studentReports.filter((student) => resolveStudentRisk(student) === 'HIGH').length,
    [studentReports],
  );

  const handlePublishAnnouncement = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      setMessage({ type: 'error', text: 'Title and message are required.' });
      return;
    }

    setPosting(true);
    try {
      const payload = {
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        audience: announcementForm.audience,
      };

      const response = await axios.post('/api/school-admin/announcements', payload);
      setAnnouncements((prev) => [response.data, ...prev]);
      setAnnouncementForm({ title: '', message: '', audience: 'ALL' });
      setMessage({ type: 'success', text: 'Announcement published successfully.' });
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to publish announcement.';
      setMessage({ type: 'error', text: String(msg) });
    } finally {
      setPosting(false);
    }
  };

  if (!isSchoolAdmin) {
    return (
      <section className="panel-card">
        <h2>Access Restricted</h2>
        <p>This page is available only for school administrators.</p>
      </section>
    );
  }

  return (
    <div className="school-admin-page">
      <section className="school-admin-hero panel-card">
        <div className="school-admin-hero-copy">
          <h1>School Admin Center</h1>
          <p>Track school-wide progress and communicate with your community.</p>
          <div className="school-admin-hero-tags">
            <span className="school-admin-chip">Role: {roleLabel}</span>
            <span className="school-admin-chip">Students: {dashboard?.totalStudents ?? 0}</span>
            <span className="school-admin-chip is-risk">High Risk: {highRiskCount}</span>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchAdminData} disabled={loading}>
          <RefreshCcw size={16} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {message.text && (
        <div className={`status-message ${message.type === 'error' ? 'status-error' : 'status-success'}`}>
          {message.text}
        </div>
      )}

      <section className="school-admin-grid">
        <article className="panel-card">
          <h2 className="section-title"><ChartBar size={18} /> Dashboard</h2>
          <p className="school-admin-subtitle">Snapshot of school performance and risk indicators.</p>
          {!dashboard ? (
            <p className="users-muted">{loading ? 'Loading dashboard...' : 'Dashboard data unavailable.'}</p>
          ) : (
            <div className="admin-stats-grid">
              <StatCard title="Total Users" value={dashboard.totalUsers} subtitle={`${dashboard.totalStudents} students`} icon={<Users size={17} />} />
              <StatCard title="Teachers" value={dashboard.totalTeachers} subtitle={`${dashboard.totalCourses} courses`} icon={<ShieldCheck size={17} />} />
              <StatCard title="Enrollments" value={dashboard.totalEnrollments} subtitle={`${dashboard.totalParents} parents`} icon={<Users size={17} />} />
              <StatCard title="Students At Risk" value={dashboard.studentsAtRisk} subtitle={`${dashboard.harmfulContentReports} harmful reports`} icon={<Bell size={17} />} />
              <StatCard title="Avg Attendance" value={`${Number(dashboard.averageAttendanceRate || 0).toFixed(1)}%`} subtitle="School average" icon={<ChartBar size={17} />} />
              <StatCard title="Overall Progress" value={`${Number(dashboard.averageOverallProgressRate || 0).toFixed(1)}%`} subtitle={`${dashboard.totalBehaviorReports} behavior reports`} icon={<ChartBar size={17} />} />
            </div>
          )}
        </article>

        <article className="panel-card">
          <h2 className="section-title"><Megaphone size={18} /> Publish Announcement</h2>
          <p className="school-admin-subtitle">Publish an announcement to selected audiences in your school.</p>
          <form className="stack-form" onSubmit={handlePublishAnnouncement}>
            <label htmlFor="announcement-title">Title</label>
            <input
              id="announcement-title"
              className="input"
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Exam Week Reminder"
              required
            />

            <label htmlFor="announcement-message">Message</label>
            <textarea
              id="announcement-message"
              className="input admin-textarea"
              value={announcementForm.message}
              onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Write your school-wide announcement here..."
              required
            />

            <label htmlFor="announcement-audience">Audience</label>
            <select
              id="announcement-audience"
              className="input"
              value={announcementForm.audience}
              onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, audience: e.target.value }))}
            >
              {audienceOptions.map((audience) => (
                <option key={audience} value={audience}>
                  {audience.replaceAll('_', ' ')}
                </option>
              ))}
            </select>

            <button type="submit" className="btn btn-primary" disabled={posting}>
              <Megaphone size={16} />
              {posting ? 'Publishing...' : 'Publish'}
            </button>
          </form>
        </article>
      </section>

      <section className="panel-card">
        <div className="school-admin-section-head">
          <h2 className="section-title"><Users size={18} /> Student Progress Report</h2>
          <div className="school-admin-toolbar">
            <input
              className="input school-admin-search-input"
              placeholder="Search student by name, email, or id"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            <select
              className="input school-admin-filter-select"
              value={studentRiskFilter}
              onChange={(e) => setStudentRiskFilter(e.target.value)}
            >
              <option value="ALL">All risk levels</option>
              <option value="HIGH">High risk</option>
              <option value="MEDIUM">Medium risk</option>
              <option value="LOW">Low risk</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className="users-muted">Loading reports...</p>
        ) : sortedReports.length === 0 ? (
          <p className="users-muted">No student progress data yet.</p>
        ) : filteredReports.length === 0 ? (
          <p className="users-muted">No students match your current search/filter.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                  <th>Assignment</th>
                  <th>Overall</th>
                  <th>Risk</th>
                  <th>Behavior Reports</th>
                  <th>Harmful Content</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((student) => (
                  <tr key={student.studentId || student.studentEmail}>
                    <td>
                      <div className="admin-student-cell">
                        <strong>{student.studentName}</strong>
                        <span>{student.studentEmail}</span>
                      </div>
                    </td>
                    <td>{Number(student.attendanceRate || 0).toFixed(1)}%</td>
                    <td>{Number(student.assignmentCompletionRate || 0).toFixed(1)}%</td>
                    <td>{Number(student.overallProgressRate || 0).toFixed(1)}%</td>
                    <td>
                      <span className={`admin-risk-chip is-${resolveStudentRisk(student).toLowerCase()}`}>
                        {resolveStudentRisk(student)}
                      </span>
                    </td>
                    <td>{student.behaviorReportCount || 0}</td>
                    <td>{student.harmfulContentReportCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="school-admin-section-head">
          <h2 className="section-title"><Bell size={18} /> Announcements</h2>
          <div className="school-admin-toolbar">
            <input
              className="input school-admin-search-input"
              placeholder="Search title, message, audience"
              value={announcementSearch}
              onChange={(e) => setAnnouncementSearch(e.target.value)}
            />
            <select
              className="input school-admin-filter-select"
              value={announcementAudienceFilter}
              onChange={(e) => setAnnouncementAudienceFilter(e.target.value)}
            >
              {announcementAudienceFilters.map((audience) => (
                <option key={audience} value={audience}>
                  {audience === 'ANY' ? 'All audiences' : formatAudienceLabel(audience)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <p className="users-muted">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="users-muted">No announcements published yet.</p>
        ) : filteredAnnouncements.length === 0 ? (
          <p className="users-muted">No announcements match your search/filter.</p>
        ) : (
          <div className="admin-announcements-list">
            {filteredAnnouncements.map((announcement) => (
              <article key={announcement.id} className="admin-announcement-card">
                <div className="admin-announcement-head">
                  <h3>{announcement.title}</h3>
                  <span>{formatAudienceLabel(announcement.audience)}</span>
                </div>
                <p>{announcement.message}</p>
                <div className="admin-announcement-meta">
                  <small>By {announcement.createdByName || 'Unknown'}</small>
                  <small>
                    {announcement.createdAt ? new Date(announcement.createdAt).toLocaleString() : 'Unknown time'}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
