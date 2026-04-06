import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link2, RefreshCcw, Search, Unlink, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const getRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';
const formatRoleLabel = (value) => String(value || 'USER').replaceAll('_', ' ');
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const progressTier = (value) => {
  const progress = Number(value || 0);
  if (progress >= 75) return 'STRONG';
  if (progress >= 50) return 'WATCH';
  return 'SUPPORT';
};

const ProgressStatCard = ({ label, value, tone }) => (
  <article className={`progress-stat-card panel-card ${tone || ''}`}>
    <p>{label}</p>
    <h3>{value}</h3>
  </article>
);

export default function ProgressCenter() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = getRole(user);

  const isParent = role === 'PARENT';
  const isSchoolAdmin = role === 'SCHOOL_ADMINISTRATOR';
  const isSystemAdmin = role === 'SYSTEM_ADMINISTRATOR';
  const isTeacher = role === 'TEACHER';
  const canManageLinks = isSchoolAdmin || isSystemAdmin;
  const canUseLookup = canManageLinks || isParent || isTeacher;

  const [loading, setLoading] = useState(true);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [allUsers, setAllUsers] = useState([]);
  const [parentLinks, setParentLinks] = useState([]);
  const [childrenProgress, setChildrenProgress] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentProgress, setStudentProgress] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [childrenSearch, setChildrenSearch] = useState('');
  const [lookupSearch, setLookupSearch] = useState('');

  const [linkForm, setLinkForm] = useState({ parentId: '', studentId: '' });
  const [unlinkForm, setUnlinkForm] = useState({ parentId: '', studentId: '' });

  const parentCandidates = useMemo(
    () => allUsers.filter((u) => String(u.legacyRole || '').toUpperCase() === 'PARENT'),
    [allUsers],
  );
  const studentCandidates = useMemo(
    () => allUsers.filter((u) => String(u.legacyRole || '').toUpperCase() === 'STUDENT'),
    [allUsers],
  );

  const lookupCandidates = useMemo(() => {
    if (isParent) {
      return childrenProgress.map((student) => ({
        id: student.studentId,
        name: student.studentName,
        email: student.studentEmail,
      }));
    }
    return studentCandidates.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
    }));
  }, [isParent, childrenProgress, studentCandidates]);

  const filteredParentLinks = useMemo(() => {
    const query = normalizeText(linkSearch);
    if (!query) return parentLinks;
    return parentLinks.filter((link) => (
      [link.studentName, link.parentName, link.studentId, link.parentId].some((value) => normalizeText(value).includes(query))
    ));
  }, [linkSearch, parentLinks]);

  const filteredChildrenProgress = useMemo(() => {
    const query = normalizeText(childrenSearch);
    if (!query) return childrenProgress;
    return childrenProgress.filter((student) => (
      [student.studentName, student.studentEmail, student.studentId].some((value) => normalizeText(value).includes(query))
    ));
  }, [childrenProgress, childrenSearch]);

  const filteredLookupCandidates = useMemo(() => {
    const query = normalizeText(lookupSearch);
    if (!query) return lookupCandidates;
    return lookupCandidates.filter((student) => (
      [student.name, student.email, student.id].some((value) => normalizeText(value).includes(query))
    ));
  }, [lookupCandidates, lookupSearch]);

  const roleLabel = formatRoleLabel(role);
  const activeLinksCount = useMemo(
    () => parentLinks.filter((link) => link.active).length,
    [parentLinks],
  );
  const summaryStats = useMemo(() => {
    const trackedLearners = isParent ? childrenProgress.length : studentCandidates.length;
    return [
      { label: t('common.role'), value: roleLabel, tone: 'is-neutral' },
      { label: t('progress.tracked_learners'), value: trackedLearners, tone: 'is-info' },
      { label: t('progress.lookup_pool'), value: lookupCandidates.length, tone: 'is-success' },
      { label: t('progress.active_links'), value: activeLinksCount, tone: 'is-warning' },
    ];
  }, [activeLinksCount, childrenProgress.length, isParent, lookupCandidates.length, roleLabel, studentCandidates.length]);

  const refreshData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const requests = [];

      if (canManageLinks) {
        requests.push(axios.get('/api/rbac/users'));
      }
      if (isTeacher) {
        requests.push(axios.get('/api/progress/teacher/students'));
      }
      if (isParent) {
        requests.push(axios.get('/api/progress/parent-links/me'));
        requests.push(axios.get('/api/progress/parent/students'));
      }

      const results = await Promise.allSettled(requests);
      let cursor = 0;

      if (canManageLinks) {
        const usersResult = results[cursor++];
        if (usersResult?.status === 'fulfilled') {
          const users = Array.isArray(usersResult.value.data) ? usersResult.value.data : [];
          setAllUsers(users);
          setLinkForm((prev) => ({ ...prev, parentId: prev.parentId || users.find((u) => String(u.legacyRole || '').toUpperCase() === 'PARENT')?.id || '' }));
          setUnlinkForm((prev) => ({ ...prev, parentId: prev.parentId || users.find((u) => String(u.legacyRole || '').toUpperCase() === 'PARENT')?.id || '' }));
          const firstStudent = users.find((u) => String(u.legacyRole || '').toUpperCase() === 'STUDENT')?.id || '';
          setLinkForm((prev) => ({ ...prev, studentId: prev.studentId || firstStudent }));
          setUnlinkForm((prev) => ({ ...prev, studentId: prev.studentId || firstStudent }));
          if (!selectedStudentId) {
            setSelectedStudentId(firstStudent);
          }
        }
      }

      if (isTeacher) {
        const teacherStudentsResult = results[cursor++];
        if (teacherStudentsResult?.status === 'fulfilled') {
          const teacherStudents = Array.isArray(teacherStudentsResult.value.data) ? teacherStudentsResult.value.data : [];
          setAllUsers(
            teacherStudents.map((student) => ({
              id: student.studentId,
              name: student.studentName,
              email: student.studentEmail,
              legacyRole: 'STUDENT',
            })),
          );
          if (!selectedStudentId && teacherStudents.length > 0) {
            setSelectedStudentId(teacherStudents[0].studentId);
          }
        }
      }

      if (isParent) {
        const linksResult = results[cursor++];
        const progressResult = results[cursor++];

        if (linksResult?.status === 'fulfilled') {
          setParentLinks(Array.isArray(linksResult.value.data) ? linksResult.value.data : []);
        }
        if (progressResult?.status === 'fulfilled') {
          const progress = Array.isArray(progressResult.value.data) ? progressResult.value.data : [];
          setChildrenProgress(progress);
          if (!selectedStudentId && progress.length > 0) {
            setSelectedStudentId(progress[0].studentId);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [canManageLinks, isParent, isTeacher]);

  const loadStudentProgress = async () => {
    setMessage({ type: '', text: '' });
    if (!selectedStudentId) {
      setMessage({ type: 'error', text: t('common.error') });
      return;
    }

    setLoadingLookup(true);
    try {
      const response = await axios.get(`/api/progress/students/${selectedStudentId}`);
      setStudentProgress(response.data || null);
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to load student progress.';
      setMessage({ type: 'error', text: String(msg) });
      setStudentProgress(null);
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleLinkParent = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (!linkForm.parentId || !linkForm.studentId) {
      setMessage({ type: 'error', text: t('common.error') });
      return;
    }

    setWorking(true);
    try {
      const response = await axios.post('/api/progress/parent-links', linkForm);
      setMessage({ type: 'success', text: t('common.success') });
      if (response.data) {
        setParentLinks((prev) => [response.data, ...prev.filter((p) => p.id !== response.data.id)]);
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to link parent and student.';
      setMessage({ type: 'error', text: String(msg) });
    } finally {
      setWorking(false);
    }
  };

  const handleUnlinkParent = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (!unlinkForm.parentId || !unlinkForm.studentId) {
      setMessage({ type: 'error', text: t('common.error') });
      return;
    }

    setWorking(true);
    try {
      await axios.delete(`/api/progress/parent-links/${unlinkForm.parentId}/${unlinkForm.studentId}`);
      setMessage({ type: 'success', text: t('common.success') });
      setParentLinks((prev) =>
        prev.map((link) =>
          link.parentId === unlinkForm.parentId && link.studentId === unlinkForm.studentId
            ? { ...link, active: false }
            : link,
        ),
      );
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to unlink parent and student.';
      setMessage({ type: 'error', text: String(msg) });
    } finally {
      setWorking(false);
    }
  };

  if (!canManageLinks && !isParent && !isTeacher) {
    return (
      <section className="panel-card">
        <h2>Access Restricted</h2>
        <p>This page supports parent views and administrator progress-link management.</p>
      </section>
    );
  }

  return (
    <div className="progress-center-page">
      <section className="progress-center-hero panel-card">
        <div className="progress-center-hero-copy">
          <h1>Progress Center</h1>
          <p>Manage parent links and review student progress summaries.</p>
          <div className="progress-hero-tags">
            <span className="progress-hero-chip">Role: {roleLabel}</span>
            <span className="progress-hero-chip">Lookup students: {lookupCandidates.length}</span>
            {isParent && <span className="progress-hero-chip is-accent">Active links: {activeLinksCount}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refreshData} disabled={loading}>
          <RefreshCcw size={16} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className="progress-stats-grid">
        {summaryStats.map((item) => (
          <ProgressStatCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </section>

      {message.text && (
        <div className={`status-message ${message.type === 'error' ? 'status-error' : 'status-success'}`}>
          {message.text}
        </div>
      )}

      {canManageLinks && (
        <section className="progress-center-grid">
          <article className="panel-card">
            <h2 className="section-title"><Link2 size={18} /> {t('progress.link_parent_student')}</h2>
            <form className="stack-form" onSubmit={handleLinkParent}>
              <label htmlFor="link-parent">Parent</label>
              <select
                id="link-parent"
                className="input"
                value={linkForm.parentId}
                onChange={(e) => setLinkForm((prev) => ({ ...prev, parentId: e.target.value }))}
                required
              >
                <option value="">Select parent</option>
                {parentCandidates.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name} ({parent.email})
                  </option>
                ))}
              </select>

              <label htmlFor="link-student">Student</label>
              <select
                id="link-student"
                className="input"
                value={linkForm.studentId}
                onChange={(e) => setLinkForm((prev) => ({ ...prev, studentId: e.target.value }))}
                required
              >
                <option value="">Select student</option>
                {studentCandidates.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>

              <button type="submit" className="btn btn-primary" disabled={working}>
                <Link2 size={16} />
                {t('common.add')}
              </button>
            </form>
          </article>

          <article className="panel-card">
            <h2 className="section-title"><Unlink size={18} /> {t('progress.unlink_parent_student')}</h2>
            <form className="stack-form" onSubmit={handleUnlinkParent}>
              <label htmlFor="unlink-parent">Parent</label>
              <select
                id="unlink-parent"
                className="input"
                value={unlinkForm.parentId}
                onChange={(e) => setUnlinkForm((prev) => ({ ...prev, parentId: e.target.value }))}
                required
              >
                <option value="">Select parent</option>
                {parentCandidates.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name} ({parent.email})
                  </option>
                ))}
              </select>

              <label htmlFor="unlink-student">Student</label>
              <select
                id="unlink-student"
                className="input"
                value={unlinkForm.studentId}
                onChange={(e) => setUnlinkForm((prev) => ({ ...prev, studentId: e.target.value }))}
                required
              >
                <option value="">Select student</option>
                {studentCandidates.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>

              <button type="submit" className="btn btn-danger" disabled={working}>
                <Unlink size={16} />
                {t('common.delete')}
              </button>
            </form>
          </article>
        </section>
      )}

      {isParent && (
        <section className="panel-card">
          <div className="progress-section-head">
            <h2 className="section-title"><Users size={18} /> My Linked Students</h2>
            <div className="progress-section-toolbar">
              <input
                className="input progress-search-input"
                placeholder={t('common.search')}
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
              />
            </div>
          </div>
          {parentLinks.length === 0 ? (
            <p className="users-muted">{loading ? t('common.loading') : t('common.not_found')}</p>
          ) : filteredParentLinks.length === 0 ? (
            <p className="users-muted">{t('common.not_found')}</p>
          ) : (
            <div className="progress-links-list">
              {filteredParentLinks.map((link) => (
                <div key={link.id} className={`progress-link-card ${link.active ? 'is-active' : 'is-inactive'}`}>
                  <strong>{link.studentName}</strong>
                  <span>{link.active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isParent && (
        <section className="panel-card">
          <div className="progress-section-head">
            <h2 className="section-title"><Users size={18} /> {t('progress.children_progress')}</h2>
            <div className="progress-section-toolbar">
              <input
                className="input progress-search-input"
                placeholder={t('common.search')}
                value={childrenSearch}
                onChange={(e) => setChildrenSearch(e.target.value)}
              />
            </div>
          </div>
          {childrenProgress.length === 0 ? (
            <p className="users-muted">{loading ? t('common.loading') : t('common.not_found')}</p>
          ) : filteredChildrenProgress.length === 0 ? (
            <p className="users-muted">{t('common.not_found')}</p>
          ) : (
            <div className="children-progress-grid">
              {filteredChildrenProgress.map((student) => (
                <div key={student.studentId} className={`children-progress-card is-${progressTier(student.overallProgressRate).toLowerCase()}`}>
                  <h3>{student.studentName}</h3>
                  <p>{student.studentEmail}</p>
                  <span className={`progress-tier-chip is-${progressTier(student.overallProgressRate).toLowerCase()}`}>
                    {progressTier(student.overallProgressRate)}
                  </span>
                  <small>{t('progress.attendance')}: {pct(student.attendanceRate)}</small>
                  <small>{t('content.assignments')}: {pct(student.assignmentCompletionRate)}</small>
                  <small>{t('progress.overall')}: {pct(student.overallProgressRate)}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {canUseLookup && (
        <section className="panel-card">
          <div className="progress-section-head">
            <h2 className="section-title"><Search size={18} /> {t('progress.student_lookup')}</h2>
            <div className="progress-section-toolbar">
              <input
                className="input progress-search-input"
                placeholder={t('common.search')}
                value={lookupSearch}
                onChange={(e) => setLookupSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="progress-lookup-row">
            <div className="progress-lookup-fields">
              <input
                className="input"
                placeholder="ID"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              />
              {filteredLookupCandidates.length > 0 && (
                <select
                  className="input"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">Select student</option>
                  {filteredLookupCandidates.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button type="button" className="btn btn-secondary" onClick={loadStudentProgress} disabled={loadingLookup}>
              <Search size={16} />
              {loadingLookup ? t('common.loading') : t('common.search')}
            </button>
          </div>

          {!studentProgress ? (
            <p className="users-muted" style={{ marginTop: '0.85rem' }}>{t('common.not_found')}</p>
          ) : (
            <div className="progress-snapshot">
              <div className="progress-snapshot-head">
                <h3>{studentProgress.studentName}</h3>
                <span>{studentProgress.studentEmail}</span>
              </div>

              <div className="progress-snapshot-metrics">
                <small>{t('progress.attendance')}: {pct(studentProgress.attendanceRate)}</small>
                <small>{t('content.assignments')}: {pct(studentProgress.assignmentCompletionRate)}</small>
                <small>{t('progress.overall')}: {pct(studentProgress.overallProgressRate)}</small>
                <small className={`progress-tier-chip is-${progressTier(studentProgress.overallProgressRate).toLowerCase()}`}>
                  {progressTier(studentProgress.overallProgressRate)}
                </small>
                <small>{t('insights.signals')} (Behavior): {studentProgress.behaviorReportCount || 0}</small>
                <small>{t('insights.signals')} (Harmful): {studentProgress.harmfulContentReportCount || 0}</small>
              </div>

              {Array.isArray(studentProgress.courseProgress) && studentProgress.courseProgress.length > 0 && (
                <div className="progress-course-list">
                  {studentProgress.courseProgress.map((course) => (
                    <div key={course.courseId} className="progress-course-item">
                      <strong>{course.courseName}</strong>
                      <span>
                        {t('common.lessons')}: {course.attendedLessons}/{course.totalLessons} | {t('content.assignments')}: {course.submittedAssignments}/{course.totalAssignments}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
