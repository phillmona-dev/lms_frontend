import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Icon = ({ d, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const icons = {
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  alert:
    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  back: 'M19 12H5M12 19l-7-7 7-7',
};

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <article className="stm-stat-card" style={{ '--stm-card-color': color }}>
    <span className="stm-stat-icon">
      <Icon d={icon} size={20} color="currentColor" />
    </span>

    <div>
      <p>{title}</p>
      <h3>{value}</h3>
      {subtitle && <span>{subtitle}</span>}
    </div>
  </article>
);

export default function StudentMonitoring() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudentProgress = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/progress/teacher/students');
        setStudents(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch student progress', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProgress();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const studentName = String(student.studentName || '').toLowerCase();
        const studentEmail = String(student.studentEmail || '').toLowerCase();

        return (
          normalizedSearch.length === 0 ||
          studentName.includes(normalizedSearch) ||
          studentEmail.includes(normalizedSearch)
        );
      }),
    [normalizedSearch, students],
  );

  const avgAttendance =
    students.length > 0
      ? (
          (students.reduce((acc, student) => acc + toNumber(student.attendanceRate), 0) /
            students.length) *
          100
        ).toFixed(1)
      : '0.0';

  const riskCount = students.filter(
    (student) => toNumber(student.behaviorReportCount) > 0 || toNumber(student.attendanceRate) < 0.7,
  ).length;

  const totalAlerts = students.reduce(
    (acc, student) => acc + toNumber(student.behaviorReportCount),
    0,
  );

  if (loading && students.length === 0) {
    return <div className="flex-center full-screen">Loading student data...</div>;
  }

  return (
    <div className="stm-page">
      <header className="stm-head">
        <div>
          <Link to="/dashboard" className="stm-back-link">
            <Icon d={icons.back} size={16} color="currentColor" />
            Back to Dashboard
          </Link>

          <h1>Student Performance</h1>
          <p>Monitor progress and risk levels for all students in your courses.</p>
        </div>

        <label className="stm-search-wrap">
          <Icon d={icons.search} size={17} color="currentColor" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
      </header>

      <section className="stm-stats-grid">
        <StatCard title="Total Students" value={students.length} icon={icons.users} color="#0d6982" />
        <StatCard
          title="Avg Attendance"
          value={`${avgAttendance}%`}
          icon={icons.check}
          color="#10b981"
        />
        <StatCard
          title="At Risk"
          value={riskCount}
          icon={icons.alert}
          color="#f59e0b"
          subtitle="Low attendance or behavior alerts"
        />
        <StatCard
          title="Total Alerts"
          value={totalAlerts}
          icon={icons.chart}
          color="#ef4444"
        />
      </section>

      <section className="stm-table-shell">
        {filteredStudents.length === 0 ? (
          <div className="stm-empty">
            <Icon d={icons.users} size={46} color="currentColor" />
            <p>No students match your search.</p>
          </div>
        ) : (
          <div className="stm-table-wrap">
            <table className="stm-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                  <th>Assignments</th>
                  <th>Avg. Grade</th>
                  <th>Status</th>
                  <th className="stm-cell-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, index) => {
                  const attendanceRate = toNumber(student.attendanceRate);
                  const behaviorReportCount = toNumber(student.behaviorReportCount);
                  const completionRate = toNumber(student.assignmentCompletionRate);
                  const avgGradeRaw = student.averageAssignmentGrade;
                  const hasAvgGrade = Number.isFinite(Number(avgGradeRaw));
                  const isAtRisk = behaviorReportCount > 0 || attendanceRate < 0.7;
                  const studentName = student.studentName || 'Student';
                  const studentEmail = student.studentEmail || '';

                  return (
                    <tr key={student.studentId ?? `${studentName}-${index}`}>
                      <td>
                        <div className="stm-student-cell">
                          <span className="stm-student-avatar">{studentName[0]?.toUpperCase() || 'S'}</span>
                          <div>
                            <strong>{studentName}</strong>
                            <span>{studentEmail}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="stm-attendance-cell">
                          <span className="stm-attendance-track">
                            <span
                              className={`stm-attendance-fill ${attendanceRate < 0.7 ? 'is-low' : 'is-good'}`}
                              style={{ '--stm-attendance-width': `${Math.round(attendanceRate * 100)}%` }}
                            />
                          </span>
                          <strong className={attendanceRate < 0.7 ? 'is-low' : ''}>
                            {Math.round(attendanceRate * 100)}%
                          </strong>
                        </div>
                      </td>

                      <td>
                        <p className="stm-assignment-primary">
                          {toNumber(student.submittedAssignments)} / {toNumber(student.totalAssignments)}
                        </p>
                        <span className="stm-assignment-sub">
                          {Math.round(completionRate * 100)}% complete
                        </span>
                      </td>

                      <td>
                        <strong className="stm-grade-value">
                          {hasAvgGrade ? `${Number(avgGradeRaw).toFixed(1)}%` : 'N/A'}
                        </strong>
                      </td>

                      <td>
                        <span className={`stm-status-pill ${isAtRisk ? 'is-risk' : 'is-ok'}`}>
                          {isAtRisk ? 'At Risk' : 'On Track'}
                        </span>
                      </td>

                      <td>
                        <Link
                          to="/dashboard"
                          onClick={() => alert('Student detail view coming soon!')}
                          className="stm-view-link"
                        >
                          View Profile
                          <Icon d={icons.arrow} size={13} color="currentColor" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
