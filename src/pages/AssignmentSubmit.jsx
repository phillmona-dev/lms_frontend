import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import ContextChatWidget from '../components/ContextChatWidget';

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
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  check: 'M20 6L9 17l-5-5',
  info: 'M12 8v4M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
};

const attachmentTypeLabelOf = (assignment) => {
  const fileName = String(assignment?.attachmentFileName || '');
  const contentType = String(assignment?.attachmentFileType || '').toLowerCase();
  const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : '';
  if (ext) return ext;
  if (contentType.includes('pdf')) return 'PDF';
  if (contentType.includes('word') || contentType.includes('msword')) return 'DOC';
  if (contentType.includes('presentation')) return 'PPT';
  if (contentType.includes('sheet') || contentType.includes('excel')) return 'XLS';
  if (contentType.includes('image')) return 'IMG';
  return 'FILE';
};

export default function AssignmentSubmit() {
  const { courseId, assignmentId } = useParams();
  const courseName = decodeURIComponent(courseId);

  const [assignment, setAssignment] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [grade, setGrade] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assignRes, gradeRes] = await Promise.allSettled([
          axios.get(`/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/view`),
          axios.get(`/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/get-grade`),
        ]);

        if (assignRes.status === 'fulfilled') {
          setAssignment(assignRes.value.data);
        } else {
          setAssignment(null);
        }

        if (gradeRes.status === 'fulfilled') {
          setGrade(gradeRes.value.data?.grade ?? null);
        } else {
          setGrade(null);
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assignmentId, courseName]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    if (selectedFile && selectedFile.type !== 'application/pdf') {
      setStatus({ type: 'error', message: 'Only PDF files are allowed.' });
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setStatus({ type: '', message: '' });
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!file) {
      setStatus({ type: 'error', message: 'Please select a PDF file.' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/submit`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      setStatus({ type: 'success', message: response.data || 'Assignment submitted successfully.' });
      setFile(null);
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data || 'Submission failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAssignmentAttachment = async () => {
    try {
      const response = await axios.get(
        `/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/attachment`,
        { responseType: 'blob' },
      );

      const contentType = response.headers?.['content-type'] || assignment?.attachmentFileType || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newTab) {
        const link = document.createElement('a');
        link.href = url;
        link.download = assignment?.attachmentFileName || `assignment_${assignmentId}_attachment`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data || 'Failed to open assignment attachment.' });
    }
  };

  if (loading) {
    return <div className="flex-center full-screen">Loading assignment...</div>;
  }

  if (!assignment) {
    return <div className="flex-center full-screen">Assignment not found.</div>;
  }

  return (
    <div className="asu-page ctx-page-with-chat">
      <Link to={`/courses/${encodeURIComponent(courseName)}`} className="asu-back-link">
        <Icon d={icons.back} size={16} color="currentColor" />
        Back to Course
      </Link>

      <section className="asu-shell">
        <header className="asu-head">
          <div>
            <h1>{assignment.title}</h1>
            <p>{assignment.description}</p>
          </div>

          {grade !== null && grade !== -1 && (
            <div className="asu-grade-badge">
              <span>Grade</span>
              <strong>{grade}%</strong>
            </div>
          )}
        </header>

        <div className="asu-meta-grid">
          <article>
            <span>Due Date</span>
            <p>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No deadline'}</p>
          </article>
          <article>
            <span>Allowed Format</span>
            <p className="is-pdf">PDF Only</p>
          </article>
        </div>

        {assignment.hasAttachment && (
          <article className="asu-upload-zone">
            <div className="asu-upload-intro">
              <span className="asu-upload-icon">
                <Icon d={icons.file} size={30} color="currentColor" />
              </span>
              <h3>Assignment Attachment</h3>
              <p>
                {assignment.attachmentFileName || 'Instructor attached a file for this assignment.'}
                {' '}({attachmentTypeLabelOf(assignment)})
              </p>
            </div>
            <button type="button" onClick={handleOpenAssignmentAttachment} className="btn btn-secondary asu-file-trigger">
              <Icon d={icons.download} size={16} color="currentColor" />
              Download Attachment
            </button>
          </article>
        )}

        <article className="asu-upload-zone">
          <form onSubmit={handleUpload} className="asu-upload-form">
            <div className="asu-upload-intro">
              <span className="asu-upload-icon">
                <Icon d={icons.upload} size={30} color="currentColor" />
              </span>
              <h3>Upload your submission</h3>
              <p>Choose a PDF file to submit this assignment.</p>
            </div>

            <input type="file" accept=".pdf" onChange={handleFileChange} id="assignment-file-upload" />
            <label htmlFor="assignment-file-upload" className="btn btn-secondary asu-file-trigger">
              {file ? file.name : 'Select PDF File'}
            </label>

            {status.message && (
              <div className={`asu-status ${status.type === 'success' ? 'is-success' : 'is-error'}`}>
                <Icon d={status.type === 'success' ? icons.check : icons.info} size={17} color="currentColor" />
                {status.message}
              </div>
            )}

            <button type="submit" disabled={uploading || !file} className="btn btn-primary asu-submit-btn">
              {uploading ? 'Uploading...' : 'Submit Assignment'}
            </button>
          </form>
        </article>
      </section>

      <ContextChatWidget
        contextType="ASSIGNMENT"
        contextKey={`${courseName}::${assignmentId}`}
        title="Assignment Q&A"
        subtitle="Use this space for assignment clarifications and submission support."
      />
    </div>
  );
}
