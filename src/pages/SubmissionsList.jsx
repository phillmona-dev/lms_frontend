import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const icons = {
  back: 'M19 12H5M12 19l-7-7 7-7',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  check: 'M20 6L9 17l-5-5',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const submissionIdOf = (submission, index) => submission?.submissionId ?? submission?.id ?? index;

export default function SubmissionsList() {
  const { courseId, assignmentId } = useParams();
  const courseName = decodeURIComponent(courseId);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState(null);
  const [newGrade, setNewGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/submissions`,
        );
        setSubmissions(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching submissions:', error);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [assignmentId, courseName]);

  const assignmentTitle = useMemo(
    () => submissions[0]?.assignmentTitle || `Assignment #${assignmentId}`,
    [assignmentId, submissions],
  );

  const handleDownload = async (submissionId, fileName) => {
    try {
      const response = await axios.get(
        `/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/submission/${submissionId}`,
        { responseType: 'blob' },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `submission_${submissionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download submission.');
    }
  };

  const handleGrade = async (submissionId) => {
    if (!newGrade || Number.isNaN(Number(newGrade))) {
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(
        `/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/submission/${submissionId}/grade`,
        { grade: parseInt(newGrade, 10) },
      );

      setSubmissions((prev) =>
        prev.map((submission) =>
          submission.submissionId === submissionId
            ? { ...submission, grade: parseInt(newGrade, 10), isGraded: true }
            : submission,
        ),
      );

      setGradingId(null);
      setNewGrade('');
    } catch (error) {
      alert('Failed to update grade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex-center full-screen">Loading submissions...</div>;
  }

  return (
    <div className="sbl-page">
      <header className="sbl-head">
        <div>
          <Link to={`/courses/${encodeURIComponent(courseName)}`} className="sbl-back-link">
            <Icon d={icons.back} size={16} color="currentColor" />
            Back to Course
          </Link>

          <h1>Assignment Submissions</h1>
          <p>Project: {assignmentTitle}</p>
        </div>

        <div className="sbl-total-badge">
          <span>Total Submissions</span>
          <strong>{submissions.length}</strong>
        </div>
      </header>

      <section className="sbl-shell">
        {submissions.length === 0 ? (
          <div className="sbl-empty">
            <Icon d={icons.file} size={48} color="currentColor" />
            <p>No student has submitted this assignment yet.</p>
          </div>
        ) : (
          <div className="sbl-table-wrap">
            <table className="sbl-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th className="sbl-cell-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {submissions.map((submission, index) => {
                  const submissionId = submissionIdOf(submission, index);
                  const studentName = submission.studentName || 'Student';

                  return (
                    <tr key={submissionId}>
                      <td>
                        <div className="sbl-student-cell">
                          <span className="sbl-student-avatar">{studentName[0]?.toUpperCase()}</span>
                          <div>
                            <strong>{studentName}</strong>
                            <span>ID: #{submission.studentId ?? '-'}</span>
                          </div>
                        </div>
                      </td>

                      <td>{new Date(submission.submissionDate).toLocaleDateString()}</td>

                      <td>
                        <span className={`sbl-status ${submission.isGraded ? 'is-graded' : 'is-pending'}`}>
                          {submission.isGraded ? 'Graded' : 'Pending Review'}
                        </span>
                      </td>

                      <td>
                        {gradingId === submissionId ? (
                          <div className="sbl-grade-edit">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={newGrade}
                              onChange={(event) => setNewGrade(event.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleGrade(submissionId)}
                              disabled={isSubmitting}
                              className="sbl-grade-save"
                            >
                              <Icon d={icons.check} size={15} color="currentColor" />
                            </button>
                          </div>
                        ) : (
                          <strong className="sbl-grade-value">
                            {submission.isGraded ? `${submission.grade}%` : '--'}
                          </strong>
                        )}
                      </td>

                      <td>
                        <div className="sbl-actions">
                          <button
                            type="button"
                            className="sbl-icon-btn"
                            onClick={() => handleDownload(submissionId, submission.fileName)}
                            title="Download PDF"
                          >
                            <Icon d={icons.download} size={17} color="currentColor" />
                          </button>

                          <button
                            type="button"
                            className="sbl-icon-btn is-edit"
                            onClick={() => {
                              setGradingId(submissionId);
                              setNewGrade(submission.grade || '');
                            }}
                            title="Grade Submission"
                          >
                            <Icon d={icons.edit} size={17} color="currentColor" />
                          </button>
                        </div>
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
