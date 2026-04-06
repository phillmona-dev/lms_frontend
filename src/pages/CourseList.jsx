import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6L9 17l-5-5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  back: 'M19 12H5M12 19l-7-7 7-7',
};

const PALETTE = ['#0ea5a8', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];
const courseNameOf = (course) => course?.courseName || course?.title || course?.name || 'Untitled Course';
const courseKeyOf = (course) => String(course?.id ?? courseNameOf(course));

export default function CourseList() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState('all');
  const [enrolling, setEnrolling] = useState({});
  const [enrollMsg, setEnrollMsg] = useState({});

  const role = user?.legacyRole || user?.roles?.[0]?.name || '';
  const normalizedRole = String(role).toUpperCase();
  const isInstructor = normalizedRole.includes('INSTRUCTOR') || normalizedRole.includes('TEACHER');
  const isStudent = normalizedRole.includes('STUDENT');
  const canAccessCourses = !normalizedRole.includes('SYSTEM') && !normalizedRole.includes('BUREAU');

  useEffect(() => {
    if (!canAccessCourses) {
      navigate('/dashboard', { replace: true });
    }
  }, [canAccessCourses, navigate]);

  const refreshCourses = async () => {
    setLoading(true);
    const [all, mine] = await Promise.allSettled([
      axios.get('/api/course/get-all-courses'),
      axios.get('/api/course/get-my-courses'),
    ]);
    if (all.status === 'fulfilled' && Array.isArray(all.value.data)) {
      setAllCourses(all.value.data);
    } else {
      setAllCourses([]);
    }
    if (mine.status === 'fulfilled' && Array.isArray(mine.value.data)) {
      setMyCourses(mine.value.data);
    } else {
      setMyCourses([]);
    }
    setLoading(false);
  };

  const refreshMyCourses = async () => {
    const result = await axios.get('/api/course/get-my-courses');
    if (Array.isArray(result.data)) {
      setMyCourses(result.data);
    }
  };

  useEffect(() => {
    if (canAccessCourses) {
      refreshCourses();
    }
  }, [canAccessCourses]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError(false);
    try {
      const result = await axios.get(`/api/course/search-course/${encodeURIComponent(query)}`);
      setSearchResult(result.data);
    } catch {
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  const handleEnroll = async (courseName, courseKey) => {
    setEnrolling((prev) => ({ ...prev, [courseKey]: true }));
    setEnrollMsg((prev) => ({ ...prev, [courseKey]: '' }));
    try {
      await axios.post(`/api/course/course/${encodeURIComponent(courseName)}/enroll`);
      setEnrollMsg((prev) => ({ ...prev, [courseKey]: 'success' }));
      await refreshMyCourses();
    } catch (error) {
      const msg = error.response?.data || 'Enrollment failed';
      setEnrollMsg((prev) => ({ ...prev, [courseKey]: String(msg) }));
    } finally {
      setEnrolling((prev) => ({ ...prev, [courseKey]: false }));
    }
  };

  const myCourseNames = useMemo(
    () => new Set(myCourses.map((course) => courseNameOf(course).toLowerCase())),
    [myCourses],
  );

  const displayCourses = tab === 'my' ? myCourses : allCourses;

  return (
    <div className="courses-page">
      <section className="courses-hero panel-card">
        <div className="courses-hero-copy">
          <h1>{t('courses.title')}</h1>
          <p>{t('courses.discover')}</p>
          <div className="courses-hero-tags">
            <span className="courses-hero-chip">{t('courses.all_courses')}: {allCourses.length}</span>
            <span className="courses-hero-chip">{t('courses.my_courses')}: {myCourses.length}</span>
            {isInstructor && <span className="courses-hero-chip is-accent">{t('courses.instructor_view')}</span>}
          </div>
        </div>
        <div className="courses-hero-actions">
          <button type="button" className="btn btn-secondary" onClick={refreshCourses} disabled={loading}>
            {loading ? t('courses.refreshing') : t('courses.refresh')}
          </button>
          <Link to="/dashboard" className="courses-back-link">
            <Icon d={icons.back} size={16} color="#0a8488" />
            {t('courses.back_to_dashboard')}
          </Link>
        </div>
      </section>

      <section className="courses-search panel-card">
        <form className="courses-search-form" onSubmit={handleSearch}>
          <div className="courses-search-input-wrap">
            <span className="courses-search-icon">
              <Icon d={icons.search} size={16} color="#8aa0b6" />
            </span>
            <input
              className="input courses-search-input"
              placeholder={t('courses.search_placeholder')}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                if (!event.target.value) {
                  setSearchResult(null);
                  setSearchError(false);
                }
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? t('courses.searching') : t('courses.search')}
          </button>
        </form>
      </section>

      {searchResult && (
        <section className="panel-card">
          <h2 className="section-title">{t('courses.search_result')}</h2>
          <div className="courses-grid">
            <CourseCard
              course={searchResult}
              color="#0ea5a8"
              isEnrolled={myCourseNames.has(courseNameOf(searchResult).toLowerCase())}
              isStudent={isStudent}
              onEnroll={handleEnroll}
              enrolling={enrolling[courseKeyOf(searchResult)]}
              enrollMsg={enrollMsg[courseKeyOf(searchResult)]}
            />
          </div>
        </section>
      )}

      {searchError && (
        <div className="status-message status-error">{t('courses.no_course_found')}</div>
      )}

      <section className="courses-tabs-wrap">
        <button
          type="button"
          className={`courses-tab ${tab === 'all' ? 'is-active' : ''}`}
          onClick={() => setTab('all')}
        >
          {t('courses.all_courses')} ({allCourses.length})
        </button>
        <button
          type="button"
          className={`courses-tab ${tab === 'my' ? 'is-active' : ''}`}
          onClick={() => setTab('my')}
        >
          {t('courses.my_courses')} ({myCourses.length})
        </button>
      </section>

      {loading ? (
        <div className="courses-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="course-skeleton" />
          ))}
        </div>
      ) : displayCourses.length === 0 ? (
        <section className="courses-empty panel-card">
          <Icon d={icons.book} size={44} color="#b9ccdb" />
          <p>{tab === 'my' ? t('courses.no_courses_yet') : t('courses.no_courses_found')}</p>
          {tab === 'my' && (
            <button type="button" className="btn btn-primary" onClick={() => setTab('all')}>
              {t('courses.browse_all')}
            </button>
          )}
        </section>
      ) : (
        <div className="courses-grid">
          {displayCourses.map((course, index) => {
            const key = courseKeyOf(course);
            return (
              <CourseCard
                key={key}
                course={course}
                color={PALETTE[index % PALETTE.length]}
                isEnrolled={myCourseNames.has(courseNameOf(course).toLowerCase())}
                isStudent={isStudent}
                onEnroll={handleEnroll}
                enrolling={enrolling[key]}
                enrollMsg={enrollMsg[key]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, color, isEnrolled, isStudent, onEnroll, enrolling, enrollMsg }) {
  const { t } = useTranslation();
  const name = courseNameOf(course);
  const description = course.courseDescription || course.description || 'No description provided.';
  const duration = course.courseDuration || course.duration;
  const courseKey = courseKeyOf(course);

  return (
    <article
      className="course-card"
      style={{
        '--course-accent': color,
        '--course-accent-soft': `${color}1f`,
        '--course-accent-light': `${color}33`,
      }}
    >
      <div className="course-card-strip" />
      <div className="course-card-body">
        <div className="course-card-head">
          <div className="course-avatar">{name[0]?.toUpperCase()}</div>
          <div className="course-head-text">
            <h3>{name}</h3>
            {duration && (
              <span className="course-duration">
                <Icon d={icons.clock} size={12} color="#7f97ac" /> {duration} {t('courses.hrs')}
              </span>
            )}
          </div>
        </div>

        <p className="course-desc">
          {description.length > 110 ? `${description.slice(0, 110)}...` : description}
        </p>

        {course.instructorName && (
          <div className="course-instructor">
            <Icon d={icons.user} size={13} color="#7f97ac" />
            {course.instructorName}
          </div>
        )}

        {isEnrolled && (
          <div className="course-enrolled-chip">
            <Icon d={icons.check} size={13} color="#15803d" />
            {t('courses.enrolled')}
          </div>
        )}

        {enrollMsg && enrollMsg !== 'success' && (
          <p className="course-error-msg">{enrollMsg}</p>
        )}

        <div className="course-actions">
          <Link to={`/courses/${encodeURIComponent(name)}`} className="course-view-btn">
            {t('courses.view')}
            <Icon d={icons.arrow} size={14} color="currentColor" />
          </Link>
          {isStudent && !isEnrolled && (
            <button
              type="button"
              className="course-enroll-btn"
              disabled={enrolling}
              onClick={() => onEnroll(name, courseKey)}
            >
              {enrolling ? t('courses.enrolling') : (
                <>
                  <Icon d={icons.plus} size={14} color="white" />
                  {t('courses.enroll')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
