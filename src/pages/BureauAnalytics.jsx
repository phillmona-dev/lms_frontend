import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertOctagon, BarChart3, Building2, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const getRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';
const formatRoleLabel = (value) => String(value || 'USER').replaceAll('_', ' ');
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const resolveSchoolRisk = (school) => {
  const harmful = Number(school?.harmfulContentReports || 0);
  const atRisk = Number(school?.atRiskStudents || 0);
  const attendance = Number(school?.averageAttendanceRate || 0);
  const overall = Number(school?.averageOverallProgressRate || 0);
  if (harmful > 0 || atRisk >= 10 || attendance < 60 || overall < 50) return 'HIGH';
  if (atRisk >= 4 || attendance < 72 || overall < 65) return 'MEDIUM';
  return 'LOW';
};

const MetricCard = ({ title, value, subtitle, icon }) => (
  <div className="bureau-metric-card">
    <div className="bureau-metric-icon">{icon}</div>
    <div>
      <p>{title}</p>
      <h3>{value}</h3>
      {subtitle && <span>{subtitle}</span>}
    </div>
  </div>
);

export default function BureauAnalytics() {
  const { user } = useAuth();
  const role = getRole(user);
  const canAccess = role === 'BUREAU_OF_EDUCATION' || role === 'SYSTEM_ADMINISTRATOR';

  const [dashboard, setDashboard] = useState(null);
  const [schoolPerformance, setSchoolPerformance] = useState([]);
  const [highRiskSchools, setHighRiskSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [highRiskSearch, setHighRiskSearch] = useState('');

  const refreshData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const [dashboardRes, performanceRes, highRiskRes] = await Promise.allSettled([
        axios.get('/api/bureau/dashboard'),
        axios.get('/api/bureau/schools/performance'),
        axios.get('/api/bureau/schools/high-risk'),
      ]);

      if (dashboardRes.status === 'fulfilled') {
        setDashboard(dashboardRes.value.data);
      } else {
        const msg = dashboardRes.reason?.response?.data?.message || dashboardRes.reason?.response?.data || 'Failed to load bureau dashboard.';
        setMessage({ type: 'error', text: String(msg) });
      }

      if (performanceRes.status === 'fulfilled') {
        setSchoolPerformance(Array.isArray(performanceRes.value.data) ? performanceRes.value.data : []);
      } else {
        setSchoolPerformance([]);
      }

      if (highRiskRes.status === 'fulfilled') {
        setHighRiskSchools(Array.isArray(highRiskRes.value.data) ? highRiskRes.value.data : []);
      } else {
        setHighRiskSchools([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    refreshData();
  }, [canAccess]);

  const availableRegions = useMemo(
    () => Array.from(new Set(schoolPerformance.map((school) => school.region).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [schoolPerformance],
  );

  const filteredSchoolPerformance = useMemo(() => {
    const query = normalizeText(searchTerm);
    return schoolPerformance.filter((school) => {
      const matchesRegion = selectedRegion === 'ALL' || school.region === selectedRegion;
      const matchesRisk = selectedRisk === 'ALL' || resolveSchoolRisk(school) === selectedRisk;
      if (!matchesRegion || !matchesRisk) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [school.schoolName, school.region, school.schoolId].some((value) => normalizeText(value).includes(query));
    });
  }, [schoolPerformance, searchTerm, selectedRegion, selectedRisk]);

  const filteredHighRiskSchools = useMemo(() => {
    const query = normalizeText(highRiskSearch);
    if (!query) return highRiskSchools;
    return highRiskSchools.filter((school) => (
      [school.schoolName, school.region, school.schoolId].some((value) => normalizeText(value).includes(query))
    ));
  }, [highRiskSchools, highRiskSearch]);

  const topPerformingSchools = useMemo(
    () => [...filteredSchoolPerformance].sort((a, b) => (b.averageOverallProgressRate || 0) - (a.averageOverallProgressRate || 0)).slice(0, 5),
    [filteredSchoolPerformance],
  );

  const riskSummary = useMemo(() => {
    const high = schoolPerformance.filter((school) => resolveSchoolRisk(school) === 'HIGH').length;
    const medium = schoolPerformance.filter((school) => resolveSchoolRisk(school) === 'MEDIUM').length;
    const low = schoolPerformance.filter((school) => resolveSchoolRisk(school) === 'LOW').length;
    return { high, medium, low };
  }, [schoolPerformance]);

  const roleLabel = formatRoleLabel(role);

  if (!canAccess) {
    return (
      <section className="panel-card">
        <h2>Access Restricted</h2>
        <p>This page is available to bureau and system administrator roles only.</p>
      </section>
    );
  }

  return (
    <div className="bureau-page">
      <section className="bureau-hero panel-card">
        <div className="bureau-hero-copy">
          <h1>Bureau Analytics</h1>
          <p>Regional view of school performance, risk, and progress indicators.</p>
          <div className="bureau-hero-tags">
            <span className="bureau-hero-chip">Role: {roleLabel}</span>
            <span className="bureau-hero-chip">Regions: {availableRegions.length}</span>
            <span className="bureau-hero-chip is-risk">High Risk Schools: {riskSummary.high}</span>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refreshData} disabled={loading}>
          <RefreshCcw size={16} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {message.text && (
        <div className={`status-message ${message.type === 'error' ? 'status-error' : 'status-success'}`}>
          {message.text}
        </div>
      )}

      <section className="panel-card">
        <h2 className="section-title"><BarChart3 size={18} /> Bureau Dashboard</h2>
        {!dashboard ? (
          <p className="users-muted">{loading ? 'Loading dashboard...' : 'No dashboard data available.'}</p>
        ) : (
          <div className="bureau-metrics-grid">
            <MetricCard title="Schools" value={dashboard.totalSchools} subtitle={`${dashboard.totalCourses} courses`} icon={<Building2 size={17} />} />
            <MetricCard title="Students" value={dashboard.totalStudents} subtitle={`${dashboard.totalTeachers} teachers`} icon={<Building2 size={17} />} />
            <MetricCard title="Avg Attendance" value={`${Number(dashboard.averageAttendanceRate || 0).toFixed(1)}%`} subtitle="Regional average" icon={<BarChart3 size={17} />} />
            <MetricCard title="Avg Assignment" value={`${Number(dashboard.averageAssignmentCompletionRate || 0).toFixed(1)}%`} subtitle="Completion rate" icon={<BarChart3 size={17} />} />
            <MetricCard title="Overall Progress" value={`${Number(dashboard.averageOverallProgressRate || 0).toFixed(1)}%`} subtitle="Cross-school average" icon={<BarChart3 size={17} />} />
            <MetricCard title="At-Risk Students" value={dashboard.totalAtRiskStudents} subtitle={`${dashboard.totalHarmfulContentReports} harmful reports`} icon={<ShieldAlert size={17} />} />
          </div>
        )}
      </section>

      <section className="bureau-grid">
        <article className="panel-card">
          <div className="bureau-section-head">
            <h2 className="section-title"><Building2 size={18} /> School Performance</h2>
            <div className="bureau-toolbar">
              <input
                className="input bureau-search-input"
                placeholder="Search school or region"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="input bureau-filter-select"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                <option value="ALL">All regions</option>
                {availableRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <select
                className="input bureau-filter-select"
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
              >
                <option value="ALL">All risk</option>
                <option value="HIGH">High risk</option>
                <option value="MEDIUM">Medium risk</option>
                <option value="LOW">Low risk</option>
              </select>
            </div>
          </div>
          {schoolPerformance.length === 0 ? (
            <p className="users-muted">{loading ? 'Loading school performance...' : 'No school data found.'}</p>
          ) : filteredSchoolPerformance.length === 0 ? (
            <p className="users-muted">No schools match your current search/filter.</p>
          ) : (
            <div className="bureau-table-wrap">
              <table className="bureau-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Region</th>
                    <th>Students</th>
                    <th>Teachers</th>
                    <th>Attendance</th>
                    <th>Overall</th>
                    <th>Risk</th>
                    <th>At-Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchoolPerformance.map((school) => (
                    <tr key={school.schoolId}>
                      <td>{school.schoolName}</td>
                      <td>{school.region}</td>
                      <td>{school.studentCount}</td>
                      <td>{school.teacherCount}</td>
                      <td>{Number(school.averageAttendanceRate || 0).toFixed(1)}%</td>
                      <td>{Number(school.averageOverallProgressRate || 0).toFixed(1)}%</td>
                      <td>
                        <span className={`bureau-risk-chip is-${resolveSchoolRisk(school).toLowerCase()}`}>
                          {resolveSchoolRisk(school)}
                        </span>
                      </td>
                      <td>{school.atRiskStudents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel-card">
          <div className="bureau-section-head">
            <h2 className="section-title"><AlertOctagon size={18} /> High-Risk Schools</h2>
            <div className="bureau-toolbar">
              <input
                className="input bureau-search-input"
                placeholder="Search high-risk schools"
                value={highRiskSearch}
                onChange={(e) => setHighRiskSearch(e.target.value)}
              />
            </div>
          </div>
          {highRiskSchools.length === 0 ? (
            <p className="users-muted">{loading ? 'Loading risk view...' : 'No high-risk schools flagged.'}</p>
          ) : filteredHighRiskSchools.length === 0 ? (
            <p className="users-muted">No high-risk schools match your search.</p>
          ) : (
            <div className="bureau-risk-list">
              {filteredHighRiskSchools.map((school) => (
                <div key={school.schoolId} className="bureau-risk-card">
                  <div className="bureau-risk-head">
                    <h3>{school.schoolName}</h3>
                    <span>{school.region}</span>
                  </div>
                  <div className="bureau-risk-meta">
                    <small>At-risk students: {school.atRiskStudents}</small>
                    <small>Harmful reports: {school.harmfulContentReports}</small>
                    <small>Attendance: {Number(school.averageAttendanceRate || 0).toFixed(1)}%</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {topPerformingSchools.length > 0 && (
            <>
              <h2 className="section-title bureau-top-title"><BarChart3 size={18} /> Top Performing Schools</h2>
              <div className="bureau-top-list">
                {topPerformingSchools.map((school, index) => (
                  <div key={school.schoolId} className="bureau-top-item">
                    <strong>#{index + 1}</strong>
                    <span>{school.schoolName}</span>
                    <small>{Number(school.averageOverallProgressRate || 0).toFixed(1)}%</small>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
