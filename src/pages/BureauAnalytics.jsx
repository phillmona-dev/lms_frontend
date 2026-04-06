import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  AlertOctagon, BarChart3, Building2, CheckCircle2, ClipboardCheck, GraduationCap,
  LayoutDashboard, Library, RefreshCcw, ShieldAlert, Trophy, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

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

const CHART_COLORS = ['#0ea5a8', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function BureauAnalytics() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { tab: urlTab } = useParams();
  const role = getRole(user);
  const canAccess = role === 'BUREAU_OF_EDUCATION' || role === 'SYSTEM_ADMINISTRATOR';

  const [dashboard, setDashboard] = useState(null);
  const [schoolPerformance, setSchoolPerformance] = useState([]);
  const [highRiskSchools, setHighRiskSchools] = useState([]);
  const [curriculumCoverage, setCurriculumCoverage] = useState([]);
  const [schoolRanking, setSchoolRanking] = useState([]);
  const [nationalExams, setNationalExams] = useState(null);
  const [schoolCompliance, setSchoolCompliance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const activeTab = useMemo(() => (urlTab || 'overview').toUpperCase(), [urlTab]);

  const refreshData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const endpoints = [
        axios.get('/api/bureau/dashboard'),
        axios.get('/api/bureau/schools/performance'),
        axios.get('/api/bureau/schools/high-risk'),
        axios.get('/api/bureau/curriculum/coverage'),
        axios.get('/api/bureau/schools/ranking'),
        axios.get('/api/bureau/exams/national'),
        axios.get('/api/bureau/schools/compliance'),
      ];

      const results = await Promise.allSettled(endpoints);
      const [db, perf, risk, curr, rank, exam, comp] = results;

      if (db.status === 'fulfilled') setDashboard(db.value.data);
      if (perf.status === 'fulfilled') setSchoolPerformance(Array.isArray(perf.value.data) ? perf.value.data : []);
      if (risk.status === 'fulfilled') setHighRiskSchools(Array.isArray(risk.value.data) ? risk.value.data : []);
      if (curr.status === 'fulfilled') setCurriculumCoverage(Array.isArray(curr.value.data) ? curr.value.data : []);
      if (rank.status === 'fulfilled') setSchoolRanking(Array.isArray(rank.value.data) ? rank.value.data : []);
      if (exam.status === 'fulfilled') setNationalExams(exam.value.data);
      if (comp.status === 'fulfilled') setSchoolCompliance(Array.isArray(comp.value.data) ? comp.value.data : []);

      if (db.status === 'rejected') {
        const msg = db.reason?.response?.data?.message || db.reason?.response?.data || 'Failed to initialize bureau dashboard.';
        setMessage({ type: 'error', text: String(msg) });
      }
    } catch (err) {
      console.error('Bureau refresh error:', err);
      setMessage({ type: 'error', text: 'Unexpected analytics failure.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) refreshData();
  }, [canAccess]);

  const availableRegions = useMemo(
    () => Array.from(new Set(schoolPerformance.map((s) => s.region).filter(Boolean))).sort(),
    [schoolPerformance]
  );

  const filteredSchoolPerformance = useMemo(() => {
    const q = normalizeText(searchTerm);
    return schoolPerformance.filter((s) => {
      const matchesReg = selectedRegion === 'ALL' || s.region === selectedRegion;
      const matchesRisk = selectedRisk === 'ALL' || resolveSchoolRisk(s) === selectedRisk;
      if (!matchesReg || !matchesRisk) return false;
      return !q || [s.schoolName, s.region].some(v => normalizeText(v).includes(q));
    });
  }, [schoolPerformance, searchTerm, selectedRegion, selectedRisk]);

  if (!canAccess) {
    return (
      <section className="panel-card">
        <h2>Access Restricted</h2>
        <p>This oversight module is restricted to authorized personnel only.</p>
      </section>
    );
  }

  const renderOverview = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section className="panel-card">
        <h2 className="section-title"><LayoutDashboard size={18} /> {t('bureau.overview')}</h2>
        {!dashboard ? <p className="users-muted">Loading metrics...</p> : (
          <div className="bureau-metrics-grid">
            <MetricCard title={t('bureau.metrics.total_schools')} value={dashboard.totalSchools} subtitle={t('bureau.metrics.monitoring')} icon={<Building2 size={17} />} />
            <MetricCard title={t('bureau.metrics.enrollment')} value={dashboard.totalStudents} subtitle={t('bureau.metrics.active_learners')} icon={<GraduationCap size={17} />} />
            <MetricCard title={t('bureau.metrics.attendance')} value={`${Number(dashboard.averageAttendanceRate || 0).toFixed(1)}%`} subtitle={t('bureau.metrics.avg_attendance')} icon={<TrendingUp size={17} />} />
            <MetricCard title={t('bureau.metrics.critical_flags')} value={dashboard.totalAtRiskStudents} subtitle={t('bureau.metrics.at_risk')} icon={<ShieldAlert size={17} />} />
          </div>
        )}
      </section>

      <div className="bureau-grid">
        <article className="panel-card">
          <h2 className="section-title"><TrendingUp size={18} /> Performance Distribution</h2>
          <div style={{ height: 350, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={schoolPerformance.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="schoolName" fontSize={10} tick={{fill: '#64748b'}} />
                <YAxis fontSize={10} tick={{fill: '#64748b'}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  cursor={{fill: '#f1f5f9'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                <Bar name="Progress Rate" dataKey="averageOverallProgressRate" fill="#0ea5a8" radius={[4, 4, 0, 0]} />
                <Bar name="Attendance" dataKey="averageAttendanceRate" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel-card">
          <h2 className="section-title"><AlertOctagon size={18} /> High-Risk Schools</h2>
          {highRiskSchools.length === 0 ? <p className="users-muted">No schools currently flagged.</p> : (
            <div className="bureau-risk-list">
              {highRiskSchools.slice(0, 4).map(s => (
                <div key={s.schoolId} className="bureau-risk-card animate-fade-in">
                  <div className="bureau-risk-head">
                    <h3 style={{fontSize: '0.9rem'}}>{s.schoolName}</h3>
                    <span className="bureau-risk-chip is-high">HIGH RISK</span>
                  </div>
                  <div className="bureau-risk-meta" style={{marginTop: '0.5rem'}}>
                    <small>Risks: {s.atRiskStudents} students at risk, {s.harmfulContentReports} reports</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <article className="panel-card animate-fade-in">
      <div className="bureau-section-head">
        <h2 className="section-title"><BarChart3 size={18} /> School Performance Metrics</h2>
        <div className="bureau-toolbar">
          <input className="input bureau-search-input" placeholder="Search school..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <select className="input bureau-filter-select" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
            <option value="ALL">All Regions</option>
            {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      
      <div style={{ height: 400, width: '100%', margin: '2rem 0' }}>
         <ResponsiveContainer>
            <AreaChart data={filteredSchoolPerformance.slice(0, 15)}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5a8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5a8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="schoolName" fontSize={9} />
              <YAxis domain={[0, 100]} fontSize={10} />
              <Tooltip />
              <Area type="monotone" dataKey="averageOverallProgressRate" stroke="#0ea5a8" fillOpacity={1} fill="url(#colorRate)" />
            </AreaChart>
         </ResponsiveContainer>
      </div>

      <div className="bureau-table-wrap">
        <table className="bureau-table">
          <thead>
            <tr><th>School</th><th>Region</th><th>Attendance</th><th>Progress</th><th>Risk</th></tr>
          </thead>
          <tbody>
            {filteredSchoolPerformance.map(s => (
              <tr key={s.schoolId}>
                <td><strong>{s.schoolName}</strong></td>
                <td>{s.region}</td>
                <td>{Number(s.averageAttendanceRate || 0).toFixed(1)}%</td>
                <td>{Number(s.averageOverallProgressRate || 0).toFixed(1)}%</td>
                <td><span className={`bureau-risk-chip is-${resolveSchoolRisk(s).toLowerCase()}`}>{resolveSchoolRisk(s)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );

  const renderRanking = () => (
    <div className="animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <article className="panel-card">
        <h2 className="section-title"><Trophy size={18} /> Ranking Leaderboard</h2>
        <div style={{ height: 350, width: '100%', marginTop: '1.5rem' }}>
          <ResponsiveContainer>
            <BarChart data={schoolRanking.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} fontSize={10} />
              <YAxis dataKey="schoolName" type="category" width={100} fontSize={9} />
              <Tooltip />
              <Bar dataKey="performanceScore" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                {schoolRanking.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#fbbf24'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel-card">
        <div className="bureau-table-wrap">
          <table className="bureau-table">
            <thead>
              <tr><th>Rank</th><th>School</th><th>Score</th><th>Exam Readiness</th><th>Compliance</th></tr>
            </thead>
            <tbody>
              {schoolRanking.map(row => (
                <tr key={row.schoolId}>
                  <td><div className={`rank-badge ${row.rank <= 3 ? 'is-top' : ''}`}>{row.rank}</div></td>
                  <td><strong>{row.schoolName}</strong></td>
                  <td><span className="score-text">{Number(row.performanceScore || 0).toFixed(1)}</span></td>
                  <td>{Number(row.examReadinessRate || 0).toFixed(1)}%</td>
                  <td>{Number(row.complianceRate || 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderCurriculum = () => (
    <div className="animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <article className="panel-card">
        <h2 className="section-title"><Library size={18} /> Coverage distribution</h2>
        <div style={{ height: 350, width: '100%', marginTop: '1.5rem' }}>
          <ResponsiveContainer>
            <AreaChart data={curriculumCoverage.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="schoolName" fontSize={9} />
              <YAxis domain={[0, 100]} fontSize={10} />
              <Tooltip />
              <Area type="step" dataKey="curriculumCoverageRate" stroke="#6366f1" fill="#e0e7ff" />
              <Area type="step" dataKey="coreSubjectCoverageRate" stroke="#10b981" fill="#d1fae5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel-card">
        <div className="bureau-table-wrap">
          <table className="bureau-table">
            <thead>
              <tr><th>School</th><th>Courses</th><th>Coverage</th><th>Core Subjects</th><th>Missing Subjects</th></tr>
            </thead>
            <tbody>
              {curriculumCoverage.map(item => (
                <tr key={item.schoolId}>
                  <td><strong>{item.schoolName}</strong></td>
                  <td>{item.totalCourses}</td>
                  <td>
                    <div className="coverage-bar-container">
                      <div className="coverage-bar" style={{width: `${item.curriculumCoverageRate}%`}}></div>
                      <span>{item.curriculumCoverageRate}%</span>
                    </div>
                  </td>
                  <td>{item.coreSubjectCoverageRate}%</td>
                  <td>
                    <div className="missing-subjects-list">
                      {item.missingSubjects?.map(sub => <span key={sub} className="subject-tag">{sub}</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderExams = () => (
    <div className="animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      {nationalExams && (
        <div className="panel-card">
          <h2 className="section-title"><GraduationCap size={18} /> National Readiness Analysis</h2>
          <div className="exams-header-grid">
            <div className="exam-stat">
              <small>National Avg Score</small>
              <h3>{Number(nationalExams.nationalAverageScore || 0).toFixed(1)}%</h3>
            </div>
            <div className="exam-stat">
              <small>National Pass Rate</small>
              <h3>{Number(nationalExams.nationalPassRate || 0).toFixed(1)}%</h3>
            </div>
            <div className="exam-stat is-success">
              <small>High Performing Schools</small>
              <h3>{nationalExams.highPerformingSchools}</h3>
            </div>
          </div>
          
          <div style={{ height: 350, width: '100%', marginTop: '2rem' }}>
            <ResponsiveContainer>
              <LineChart data={nationalExams.schoolResults?.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="schoolName" fontSize={9} />
                <YAxis domain={[0, 100]} fontSize={10} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="averageScore" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <article className="panel-card">
        <h2 className="section-title">School Level Readiness Matrix</h2>
        <div className="bureau-table-wrap">
          <table className="bureau-table">
            <thead>
              <tr><th>School</th><th>Candidates</th><th>Avg Score</th><th>Pass Rate</th><th>Readiness</th></tr>
            </thead>
            <tbody>
              {nationalExams?.schoolResults?.map(s => (
                <tr key={s.schoolId}>
                  <td><strong>{s.schoolName}</strong></td>
                  <td>{s.candidates}</td>
                  <td>{Number(s.averageScore || 0).toFixed(1)}%</td>
                  <td>{Number(s.passRate || 0).toFixed(1)}%</td>
                  <td><span className={`readiness-chip is-${s.readinessLevel?.toLowerCase()}`}>{s.readinessLevel}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderCompliance = () => (
    <div className="animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <article className="panel-card">
        <h2 className="section-title"><ClipboardCheck size={18} /> Compliance Dimension Analysis</h2>
        <div style={{ height: 400, width: '100%', marginTop: '1.5rem' }}>
          <ResponsiveContainer>
             <RadarChart outerRadius="80%" data={schoolCompliance.slice(0, 5)}>
               <PolarGrid stroke="#e2e8f0" />
               <PolarAngleAxis dataKey="schoolName" />
               <PolarRadiusAxis angle={30} domain={[0, 100]} />
               <Radar name="Overall Compliance" dataKey="overallComplianceRate" stroke="#0ea5a8" fill="#0ea5a8" fillOpacity={0.6} />
               <Tooltip />
             </RadarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel-card">
        <div className="bureau-table-wrap">
          <table className="bureau-table">
            <thead>
              <tr><th>School</th><th>Curriculum</th><th>Attendance</th><th>Safety</th><th>Reporting</th><th>Status</th></tr>
            </thead>
            <tbody>
              {schoolCompliance.map(s => (
                <tr key={s.schoolId}>
                  <td><strong>{s.schoolName}</strong></td>
                  <td>{Number(s.curriculumComplianceRate || 0).toFixed(0)}%</td>
                  <td>{Number(s.attendanceComplianceRate || 0).toFixed(0)}%</td>
                  <td>{Number(s.safetyComplianceRate || 0).toFixed(0)}%</td>
                  <td>{Number(s.dataReportingComplianceRate || 0).toFixed(0)}%</td>
                  <td><span className={`compliance-badge is-${s.status?.toLowerCase()}`}>{s.status?.replaceAll('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  return (
    <div className="bureau-page animate-fade-in">
      <section className="bureau-hero panel-card">
        <div className="bureau-hero-copy">
          <h1>{t('bureau.hero_title')}</h1>
          <p>{t('bureau.hero_desc', { tab: formatRoleLabel(activeTab) })}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refreshData} disabled={loading}>
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? t('bureau.syncing') : t('bureau.sync')}
        </button>
      </section>

      {message.text && (
        <div className={`status-message ${message.type === 'error' ? 'status-error' : 'status-success'}`}>
          {message.text}
        </div>
      )}

      <div className="bureau-content-area">
        {activeTab === 'OVERVIEW' && renderOverview()}
        {activeTab === 'PERFORMANCE' && renderPerformance()}
        {activeTab === 'RANKING' && renderRanking()}
        {activeTab === 'CURRICULUM' && renderCurriculum()}
        {activeTab === 'EXAMS' && renderExams()}
        {activeTab === 'COMPLIANCE' && renderCompliance()}
      </div>
    </div>
  );
}
