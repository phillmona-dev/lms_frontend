import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Building2, Link2, RefreshCcw, School, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const getRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';
const normalizeText = (value) => String(value || '').trim().toLowerCase();
const formatRoleLabel = (value) => String(value || 'USER').replace(/_/g, ' ');

export default function SchoolDirectory() {
  const { user } = useAuth();
  const role = getRole(user);
  const isSystemAdmin = role === 'SYSTEM_ADMINISTRATOR';

  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [assigningUser, setAssigningUser] = useState(false);
  const [assigningCourse, setAssigningCourse] = useState(false);
  const [activeModal, setActiveModal] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  const [schoolForm, setSchoolForm] = useState({ name: '', region: '', code: '' });
  const [userAssignForm, setUserAssignForm] = useState({ userId: '', schoolId: '' });
  const [courseAssignForm, setCourseAssignForm] = useState({ courseId: '', schoolId: '' });

  const fetchData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    const requests = [axios.get('/api/schools')];
    if (isSystemAdmin) {
      requests.push(axios.get('/api/rbac/users'));
      requests.push(axios.get('/api/course/get-all-courses'));
    }

    try {
      const results = await Promise.allSettled(requests);

      const schoolsResult = results[0];
      if (schoolsResult.status === 'fulfilled') {
        setSchools(Array.isArray(schoolsResult.value.data) ? schoolsResult.value.data : []);
      } else {
        const msg = schoolsResult.reason?.response?.data?.message || schoolsResult.reason?.response?.data || 'Failed to load schools.';
        setMessage({ type: 'error', text: String(msg) });
      }

      if (isSystemAdmin) {
        const usersResult = results[1];
        const coursesResult = results[2];

        if (usersResult?.status === 'fulfilled') {
          setUsers(Array.isArray(usersResult.value.data) ? usersResult.value.data : []);
        }
        if (coursesResult?.status === 'fulfilled') {
          setCourses(Array.isArray(coursesResult.value.data) ? coursesResult.value.data : []);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isSystemAdmin]);

  const sortedSchools = useMemo(
    () => [...schools].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [schools],
  );

  const availableRegions = useMemo(
    () => Array.from(new Set(sortedSchools.map((school) => school.region).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [sortedSchools],
  );

  const filteredSchools = useMemo(() => {
    const q = normalizeText(searchTerm);
    return sortedSchools.filter((school) => {
      const matchesRegion = selectedRegion === 'ALL' || school.region === selectedRegion;
      if (!matchesRegion) {
        return false;
      }
      if (!q) {
        return true;
      }
      return [school.name, school.region, school.code].some((value) => normalizeText(value).includes(q));
    });
  }, [searchTerm, selectedRegion, sortedSchools]);

  const summaryStats = useMemo(() => {
    const uniqueRegions = availableRegions.length;
    return [
      { label: 'Schools', value: sortedSchools.length, tone: 'is-info' },
      { label: 'Regions', value: uniqueRegions, tone: 'is-success' },
      { label: 'Users Loaded', value: users.length, tone: 'is-warning' },
      { label: 'Courses Loaded', value: courses.length, tone: 'is-neutral' },
    ];
  }, [availableRegions.length, courses.length, sortedSchools.length, users.length]);

  const roleLabel = formatRoleLabel(role);

  const handleCreateSchool = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!schoolForm.name || !schoolForm.region || !schoolForm.code) {
      setMessage({ type: 'error', text: 'Please fill in school name, region, and code.' });
      return;
    }

    setCreatingSchool(true);
    try {
      const payload = {
        name: schoolForm.name.trim(),
        region: schoolForm.region.trim(),
        code: schoolForm.code.trim().toUpperCase(),
      };
      const response = await axios.post('/api/schools', payload);
      const createdSchool = response.data;
      setSchools((prev) => [...prev, createdSchool]);
      setSchoolForm({ name: '', region: '', code: '' });
      setActiveModal('');
      setMessage({ type: 'success', text: 'School created successfully.' });
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to create school.';
      setMessage({ type: 'error', text: String(msg) });
    } finally {
      setCreatingSchool(false);
    }
  };

  const handleAssignUser = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (!userAssignForm.userId || !userAssignForm.schoolId) {
      setMessage({ type: 'error', text: 'Select both user and school before assigning.' });
      return;
    }

    setAssigningUser(true);
    try {
      await axios.post('/api/schools/assign-user', {
        userId: userAssignForm.userId,
        schoolId: Number(userAssignForm.schoolId),
      });
      setUserAssignForm({ userId: '', schoolId: '' });
      setActiveModal('');
      setMessage({ type: 'success', text: 'User assigned to school successfully.' });
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to assign user.';
      setMessage({ type: 'error', text: String(msg) });
    } finally {
      setAssigningUser(false);
    }
  };

  const handleAssignCourse = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (!courseAssignForm.courseId || !courseAssignForm.schoolId) {
      setMessage({ type: 'error', text: 'Select both course and school before assigning.' });
      return;
    }

    setAssigningCourse(true);
    try {
      await axios.post('/api/schools/assign-course', {
        courseId: Number(courseAssignForm.courseId),
        schoolId: Number(courseAssignForm.schoolId),
      });
      setCourseAssignForm({ courseId: '', schoolId: '' });
      setActiveModal('');
      setMessage({ type: 'success', text: 'Course assigned to school successfully.' });
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to assign course.';
      setMessage({ type: 'error', text: String(msg) });
    } finally {
      setAssigningCourse(false);
    }
  };

  const modalTitle =
    activeModal === 'create-school'
      ? 'Create School'
      : activeModal === 'assign-user'
        ? 'Assign User To School'
        : activeModal === 'assign-course'
          ? 'Assign Course To School'
          : '';

  const modalSubtitle =
    activeModal === 'create-school'
      ? 'Add a new school so users and courses can be assigned correctly.'
      : activeModal === 'assign-user'
        ? 'Map a user account to a school for scoped access.'
        : activeModal === 'assign-course'
          ? 'Attach a course to a school context.'
          : '';

  return (
    <div className="school-page">
      <section className="school-hero panel-card">
        <div className="school-hero-copy">
          <h1>School Directory</h1>
          <p>View schools and map users or courses to their school context.</p>
          <div className="school-hero-tags">
            <span className="school-role-chip">Role: {roleLabel}</span>
            <span className="school-info-chip">Access: {isSystemAdmin ? 'Full' : 'Read only'}</span>
            <span className="school-info-chip">Catalog: {sortedSchools.length} schools</span>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          <RefreshCcw size={16} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className="school-stats-grid">
        {summaryStats.map((item) => (
          <article key={item.label} className={`school-stat-card panel-card ${item.tone}`}>
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

      {isSystemAdmin && (
        <section className="panel-card school-admin-actions">
          <div className="school-admin-actions-head">
            <h2 className="section-title">Directory Actions</h2>
            <p className="school-form-subtitle">Use quick actions to create a school or manage school assignments.</p>
          </div>
          <div className="school-admin-actions-buttons">
            <button type="button" className="btn btn-primary" onClick={() => setActiveModal('create-school')}>
              <Building2 size={17} />
              Create School
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveModal('assign-user')}
              disabled={sortedSchools.length === 0 || users.length === 0}
            >
              <Users size={17} />
              Assign User
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveModal('assign-course')}
              disabled={sortedSchools.length === 0 || courses.length === 0}
            >
              <Link2 size={17} />
              Assign Course
            </button>
          </div>
        </section>
      )}

      {!isSystemAdmin && (
        <section className="panel-card">
          <p className="school-readonly-note">You have read-only access here. School creation and assignments are available to system administrators.</p>
        </section>
      )}

      <section className="panel-card">
        <div className="school-directory-head">
          <h2 className="section-title">Configured Schools</h2>
          <div className="school-directory-toolbar">
            <input
              className="input school-search-input"
              placeholder="Search by name, region, or code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="input school-region-filter"
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
          </div>
        </div>
        {loading ? (
          <p className="users-muted">Loading schools...</p>
        ) : sortedSchools.length === 0 ? (
          <p className="users-muted">No schools have been created yet.</p>
        ) : filteredSchools.length === 0 ? (
          <p className="users-muted">No schools match your current search/filter.</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table school-table">
              <thead>
                <tr>
                  <th>School Name</th>
                  <th>Region</th>
                  <th>Code</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => (
                  <tr key={school.id}>
                    <td>{school.name || '-'}</td>
                    <td>{school.region || '-'}</td>
                    <td><span className="school-code-chip">{school.code || '-'}</span></td>
                    <td><span className="app-table-id">#{school.id}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isSystemAdmin && activeModal && (
        <div
          className="app-modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveModal('');
            }
          }}
        >
          <div className="app-modal panel-card" role="dialog" aria-modal="true" aria-label={modalTitle}>
            <div className="app-modal-head">
              <div>
                <h3>{modalTitle}</h3>
                <p className="app-modal-subtitle">{modalSubtitle}</p>
              </div>
              <button type="button" className="app-modal-close" onClick={() => setActiveModal('')} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {activeModal === 'create-school' && (
              <form className="stack-form" onSubmit={handleCreateSchool}>
                <label htmlFor="school-name">School Name</label>
                <input
                  id="school-name"
                  className="input"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Abugida Secondary School"
                  required
                />

                <label htmlFor="school-region">Region</label>
                <input
                  id="school-region"
                  className="input"
                  value={schoolForm.region}
                  onChange={(e) => setSchoolForm((prev) => ({ ...prev, region: e.target.value }))}
                  placeholder="Addis Ababa"
                  required
                />

                <label htmlFor="school-code">Code</label>
                <input
                  id="school-code"
                  className="input"
                  value={schoolForm.code}
                  onChange={(e) => setSchoolForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="AAS-001"
                  required
                />

                <button type="submit" className="btn btn-primary" disabled={creatingSchool}>
                  <Building2 size={17} />
                  {creatingSchool ? 'Creating...' : 'Create School'}
                </button>
              </form>
            )}

            {activeModal === 'assign-user' && (
              <form className="stack-form" onSubmit={handleAssignUser}>
                <label htmlFor="assign-user-id">User</label>
                <select
                  id="assign-user-id"
                  className="input"
                  value={userAssignForm.userId}
                  onChange={(e) => setUserAssignForm((prev) => ({ ...prev, userId: e.target.value }))}
                  required
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.id || u.email} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>

                <label htmlFor="assign-user-school">School</label>
                <select
                  id="assign-user-school"
                  className="input"
                  value={userAssignForm.schoolId}
                  onChange={(e) => setUserAssignForm((prev) => ({ ...prev, schoolId: e.target.value }))}
                  required
                >
                  <option value="">Select school</option>
                  {sortedSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.code})
                    </option>
                  ))}
                </select>

                <button type="submit" className="btn btn-primary" disabled={assigningUser || sortedSchools.length === 0 || users.length === 0}>
                  <Link2 size={17} />
                  {assigningUser ? 'Assigning...' : 'Assign User'}
                </button>
              </form>
            )}

            {activeModal === 'assign-course' && (
              <form className="stack-form" onSubmit={handleAssignCourse}>
                <label htmlFor="assign-course-id">Course</label>
                <select
                  id="assign-course-id"
                  className="input"
                  value={courseAssignForm.courseId}
                  onChange={(e) => setCourseAssignForm((prev) => ({ ...prev, courseId: e.target.value }))}
                  required
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course.id || course.courseName} value={course.id}>
                      {course.courseName || course.title || `Course ${course.id}`}
                    </option>
                  ))}
                </select>

                <label htmlFor="assign-course-school">School</label>
                <select
                  id="assign-course-school"
                  className="input"
                  value={courseAssignForm.schoolId}
                  onChange={(e) => setCourseAssignForm((prev) => ({ ...prev, schoolId: e.target.value }))}
                  required
                >
                  <option value="">Select school</option>
                  {sortedSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.code})
                    </option>
                  ))}
                </select>

                <button type="submit" className="btn btn-primary" disabled={assigningCourse || sortedSchools.length === 0 || courses.length === 0}>
                  <Link2 size={17} />
                  {assigningCourse ? 'Assigning...' : 'Assign Course'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
