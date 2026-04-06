import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, FileSearch, Flag, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const severityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const getRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';

const resolveCourseName = (course) => course?.courseName || course?.name || course?.title || '';

const formatDateTime = (value) => {
  if (!value) {
    return 'Unknown time';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const formatRoleLabel = (role) => {
  if (!role) {
    return 'User';
  }
  return role.replace(/_/g, ' ');
};

const normalizeSeverity = (severity) => {
  const value = String(severity || '').toUpperCase();
  return severityOptions.includes(value) ? value : 'LOW';
};

const matchesSeverityFilter = (report, filterValue) => {
  if (filterValue === 'ALL') {
    return true;
  }
  return normalizeSeverity(report?.severity) === filterValue;
};

const resolveStatusTone = (status) => {
  const upperStatus = String(status || '').toUpperCase();
  if (upperStatus === 'RESOLVED' || upperStatus === 'CLOSED') {
    return 'is-resolved';
  }
  if (upperStatus === 'IN_REVIEW' || upperStatus === 'PENDING') {
    return 'is-review';
  }
  return 'is-open';
};

export default function BehaviorReports() {
  const { user } = useAuth();
  const role = getRole(user);
  const isTeacher = role === 'TEACHER';
  const isSchoolAdmin = role === 'SCHOOL_ADMINISTRATOR';
  const isSystemAdmin = role === 'SYSTEM_ADMINISTRATOR';
  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStudentReports, setLoadingStudentReports] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [teacherCourses, setTeacherCourses] = useState([]);
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [studentReports, setStudentReports] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [teacherSeverityFilter, setTeacherSeverityFilter] = useState('ALL');
  const [historySeverityFilter, setHistorySeverityFilter] = useState('ALL');

  const [createForm, setCreateForm] = useState({
    courseName: '',
    studentId: '',
    title: '',
    description: '',
    severity: 'MEDIUM',
    harmfulContent: false,
    actionTaken: '',
  });

  const filteredStudentsForCourse = useMemo(() => {
    if (!createForm.courseName) {
      return candidateStudents;
    }
    return candidateStudents.filter((student) => {
      if (!Array.isArray(student.courseProgress)) {
        return false;
      }
      return student.courseProgress.some((course) => course.courseName === createForm.courseName);
    });
  }, [candidateStudents, createForm.courseName]);

  const filteredMyReports = useMemo(
    () => myReports.filter((report) => matchesSeverityFilter(report, teacherSeverityFilter)),
    [myReports, teacherSeverityFilter],
  );

  const filteredStudentReports = useMemo(
    () => studentReports.filter((report) => matchesSeverityFilter(report, historySeverityFilter)),
    [studentReports, historySeverityFilter],
  );

  const summaryReports = useMemo(() => (isTeacher ? myReports : studentReports), [isTeacher, myReports, studentReports]);

  const summaryStats = useMemo(() => {
    const total = summaryReports.length;
    const highRiskCount = summaryReports.filter((report) => ['HIGH', 'CRITICAL'].includes(normalizeSeverity(report.severity))).length;
    const harmfulCount = summaryReports.filter((report) => report.harmfulContent).length;
    const openCount = summaryReports.filter((report) => !['RESOLVED', 'CLOSED'].includes(String(report.status || '').toUpperCase())).length;

    return [
      { label: 'Total Reports', value: total, tone: 'is-neutral' },
      { label: 'High Risk', value: highRiskCount, tone: 'is-warning' },
      { label: 'Harmful Flags', value: harmfulCount, tone: 'is-danger' },
      { label: 'Open Cases', value: openCount, tone: 'is-info' },
    ];
  }, [summaryReports]);

  const canEditStudentId = !isStudent;
  const knownStudentCount = candidateStudents.length;
  const roleLabel = formatRoleLabel(role);

  const refreshTeacherReports = async () => {
    if (!isTeacher) {
      return;
    }
    try {
      const reportsRes = await axios.get('/api/behavior-reports/me/reported');
      setMyReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
    } catch {
      setMyReports([]);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    const requests = [];

    if (isTeacher) {
      requests.push(axios.get('/api/course/get-my-courses'));
      requests.push(axios.get('/api/progress/teacher/students'));
      requests.push(axios.get('/api/behavior-reports/me/reported'));
    } else if (isSchoolAdmin) {
      requests.push(axios.get('/api/school-admin/reports/students'));
    } else if (isSystemAdmin) {
      requests.push(axios.get('/api/rbac/users'));
    } else if (isParent) {
      requests.push(axios.get('/api/progress/parent/students'));
    }

    try {
      const results = await Promise.allSettled(requests);

      if (isTeacher) {
        const [coursesRes, studentsRes, reportsRes] = results;

        if (coursesRes?.status === 'fulfilled') {
          const courses = Array.isArray(coursesRes.value.data) ? coursesRes.value.data : [];
          setTeacherCourses(courses);
          const firstCourseName = resolveCourseName(courses[0]);
          setCreateForm((prev) => ({ ...prev, courseName: prev.courseName || firstCourseName }));
        }

        if (studentsRes?.status === 'fulfilled') {
          const students = Array.isArray(studentsRes.value.data) ? studentsRes.value.data : [];
          setCandidateStudents(students);
          const firstStudentId = students[0]?.studentId || '';
          setSelectedStudentId((prev) => prev || firstStudentId);
          setCreateForm((prev) => ({ ...prev, studentId: prev.studentId || firstStudentId }));
        }

        if (reportsRes?.status === 'fulfilled') {
          setMyReports(Array.isArray(reportsRes.value.data) ? reportsRes.value.data : []);
        }
      } else if (isSchoolAdmin) {
        const [studentsRes] = results;
        if (studentsRes?.status === 'fulfilled') {
          const students = Array.isArray(studentsRes.value.data) ? studentsRes.value.data : [];
          setCandidateStudents(students);
          setSelectedStudentId((prev) => prev || students[0]?.studentId || '');
        }
      } else if (isSystemAdmin) {
        const [usersRes] = results;
        if (usersRes?.status === 'fulfilled') {
          const users = Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
          const students = users
            .filter((item) => (item.legacyRole || '').toUpperCase() === 'STUDENT')
            .map((item) => ({
              studentId: item.id,
              studentName: item.name,
              studentEmail: item.email,
            }));
          setCandidateStudents(students);
          setSelectedStudentId((prev) => prev || students[0]?.studentId || '');
        }
      } else if (isParent) {
        const [studentsRes] = results;
        if (studentsRes?.status === 'fulfilled') {
          const students = Array.isArray(studentsRes.value.data) ? studentsRes.value.data : [];
          setCandidateStudents(students);
          setSelectedStudentId((prev) => prev || students[0]?.studentId || '');
        }
      } else if (isStudent) {
        const selfId = user?.id || user?.publicId || '';
        if (selfId) {
          setSelectedStudentId(String(selfId));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [isTeacher, isSchoolAdmin, isSystemAdmin, isParent, isStudent]);

  useEffect(() => {
    if (!isTeacher) {
      return;
    }
    const firstFilteredStudentId = filteredStudentsForCourse[0]?.studentId || '';
    setCreateForm((prev) => ({
      ...prev,
      studentId: filteredStudentsForCourse.some((s) => s.studentId === prev.studentId) ? prev.studentId : firstFilteredStudentId,
    }));
  }, [isTeacher, filteredStudentsForCourse]);

  const loadStudentReports = async () => {
    setMessage({ type: '', text: '' });
    if (!selectedStudentId) {
      setMessage({ type: 'error', text: 'Provide a student ID to load reports.' });
      return;
    }

    setLoadingStudentReports(true);
    try {
      const response = await axios.get(`/api/behavior-reports/students/${selectedStudentId}`);
      setStudentReports(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to load student behavior reports.';
      setMessage({ type: 'error', text: String(msg) });
      setStudentReports([]);
    } finally {
      setLoadingStudentReports(false);
    }
  };

  const handleCreateReport = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!createForm.courseName || !createForm.studentId || !createForm.title.trim() || !createForm.description.trim()) {
      setMessage({ type: 'error', text: 'Course, student, title, and description are required.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        severity: createForm.severity,
        harmfulContent: createForm.harmfulContent,
        actionTaken: createForm.actionTaken.trim() || null,
      };

      await axios.post(
        `/api/behavior-reports/courses/${encodeURIComponent(createForm.courseName)}/students/${createForm.studentId}`,
        payload,
      );

      setCreateForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        actionTaken: '',
        harmfulContent: false,
      }));

      setMessage({ type: 'success', text: 'Behavior report created successfully.' });
      await refreshTeacherReports();
      if (selectedStudentId === createForm.studentId) {
        await loadStudentReports();
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to create behavior report.';
      setMessage({ type: 'error', text: String(msg) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="behavior-page">
      <section className="behavior-hero panel-card">
        <div className="behavior-hero-copy">
          <h1>Behavior Reports</h1>
          <p>Track behavior issues and review student safety insights.</p>
          <div className="behavior-hero-tags">
            <span className="behavior-role-chip">Role: {roleLabel}</span>
            <span className="behavior-info-chip">Known students: {knownStudentCount}</span>
            {isTeacher && <span className="behavior-info-chip">My reports: {myReports.length}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchInitialData} disabled={loading}>
          <RefreshCcw size={16} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className="behavior-stats-grid">
        {summaryStats.map((item) => (
          <article key={item.label} className={`behavior-stat-card panel-card ${item.tone}`}>
            <p>{item.label}</p>
            <h3>{item.value}</h3>
          </article>
        ))}
      </section>

      {message.text && (
        <div className={`status-message ${message.type === 'error' ? 'status-error' : 'status-success'}`}>
          {message.text}
        </div>
      )}

      {isTeacher && (
        <section className="panel-card">
          <h2 className="section-title"><Flag size={18} /> Create Behavior Report</h2>
          <p className="behavior-section-subtitle">Capture incidents with clear details to help admins and guardians take action quickly.</p>
          <form className="stack-form behavior-form" onSubmit={handleCreateReport}>
            <label htmlFor="report-course">Course</label>
            <select
              id="report-course"
              className="input"
              value={createForm.courseName}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, courseName: e.target.value }))}
              required
            >
              <option value="">Select course</option>
              {teacherCourses.map((course) => {
                const name = resolveCourseName(course);
                return (
                  <option key={course.id || name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>

            <label htmlFor="report-student">Student</label>
            <select
              id="report-student"
              className="input"
              value={createForm.studentId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, studentId: e.target.value }))}
              required
            >
              <option value="">Select student</option>
              {filteredStudentsForCourse.map((student) => (
                <option key={student.studentId} value={student.studentId}>
                  {student.studentName} ({student.studentEmail})
                </option>
              ))}
            </select>

            <label htmlFor="report-title">Title</label>
            <input
              id="report-title"
              className="input"
              value={createForm.title}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Classroom disruption during quiz"
              required
            />

            <label htmlFor="report-description">Description</label>
            <textarea
              id="report-description"
              className="input behavior-textarea"
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the behavior incident in detail..."
              required
            />

            <label htmlFor="report-severity">Severity</label>
            <select
              id="report-severity"
              className="input"
              value={createForm.severity}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, severity: e.target.value }))}
            >
              {severityOptions.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>

            <label htmlFor="report-action">Action Taken (Optional)</label>
            <input
              id="report-action"
              className="input"
              value={createForm.actionTaken}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, actionTaken: e.target.value }))}
              placeholder="Warning issued and parent contacted."
            />

            <label className="behavior-checkbox">
              <input
                type="checkbox"
                checked={createForm.harmfulContent}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, harmfulContent: e.target.checked }))}
              />
              Mark as harmful content
            </label>
            <small className="behavior-inline-note">Use this only for incidents requiring urgent follow-up.</small>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <ShieldAlert size={16} />
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </section>
      )}

      {isTeacher && (
        <section className="panel-card">
          <div className="behavior-section-head">
            <h2 className="section-title"><FileSearch size={18} /> My Reported Issues</h2>
            <div className="behavior-filter-row">
              {['ALL', ...severityOptions].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`behavior-filter-btn ${teacherSeverityFilter === option ? 'is-active' : ''}`}
                  onClick={() => setTeacherSeverityFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          {myReports.length === 0 ? (
            <p className="behavior-empty-state">No behavior reports submitted yet.</p>
          ) : filteredMyReports.length === 0 ? (
            <p className="behavior-empty-state">No reports match the selected severity filter.</p>
          ) : (
            <div className="behavior-list">
              {filteredMyReports.map((report) => (
                <article key={report.id} className={`behavior-card severity-${normalizeSeverity(report.severity).toLowerCase()}`}>
                  <div className="behavior-card-head">
                    <h3>{report.title}</h3>
                    <span className={`behavior-severity severity-${normalizeSeverity(report.severity).toLowerCase()}`}>
                      {normalizeSeverity(report.severity)}
                    </span>
                  </div>
                  <p>{report.description}</p>
                  <div className="behavior-meta">
                    <small>Student: {report.studentName}</small>
                    <small className={`behavior-status ${resolveStatusTone(report.status)}`}>Status: {report.status || 'OPEN'}</small>
                    <small>{formatDateTime(report.createdAt)}</small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="panel-card">
        <div className="behavior-section-head">
          <h2 className="section-title"><AlertTriangle size={18} /> Student Behavior History</h2>
          <div className="behavior-filter-row">
            {['ALL', ...severityOptions].map((option) => (
              <button
                key={option}
                type="button"
                className={`behavior-filter-btn ${historySeverityFilter === option ? 'is-active' : ''}`}
                onClick={() => setHistorySeverityFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <p className="behavior-section-subtitle">
          {isStudent
            ? 'Your student ID is prefilled from your account.'
            : 'Search by student UUID or choose one from your known student list.'}
        </p>
        <div className="behavior-lookup">
          <div className="behavior-lookup-fields">
            <input
              className="input"
              placeholder="Student UUID"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={!canEditStudentId}
            />

            {candidateStudents.length > 0 && (
              <select
                className="input"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Select known student</option>
                {candidateStudents.map((student) => (
                  <option key={student.studentId} value={student.studentId}>
                    {student.studentName} ({student.studentEmail})
                  </option>
                ))}
              </select>
            )}
          </div>
          <button type="button" className="btn btn-secondary" onClick={loadStudentReports} disabled={loadingStudentReports}>
            <FileSearch size={16} />
            {loadingStudentReports ? 'Loading...' : 'Load Reports'}
          </button>
        </div>

        {loadingStudentReports ? (
          <p className="behavior-empty-state">Loading student reports...</p>
        ) : studentReports.length === 0 ? (
          <p className="behavior-empty-state">No reports loaded yet.</p>
        ) : filteredStudentReports.length === 0 ? (
          <p className="behavior-empty-state">No student reports match the selected severity filter.</p>
        ) : (
          <div className="behavior-list" style={{ marginTop: '0.95rem' }}>
            {filteredStudentReports.map((report) => (
              <article key={report.id} className={`behavior-card severity-${normalizeSeverity(report.severity).toLowerCase()}`}>
                <div className="behavior-card-head">
                  <h3>{report.title}</h3>
                  <span className={`behavior-severity severity-${normalizeSeverity(report.severity).toLowerCase()}`}>
                    {normalizeSeverity(report.severity)}
                  </span>
                </div>
                <p>{report.description}</p>
                <div className="behavior-meta">
                  <small>Course: {report.courseName || 'N/A'}</small>
                  <small>Teacher: {report.teacherName || 'N/A'}</small>
                  <small className={`behavior-status ${resolveStatusTone(report.status)}`}>Status: {report.status || 'OPEN'}</small>
                  <small>{formatDateTime(report.createdAt)}</small>
                </div>
                {report.harmfulContent && <div className="behavior-flag">Harmful content flagged</div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
