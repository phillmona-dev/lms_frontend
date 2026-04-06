import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
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
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  assign: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  quiz: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  warning: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  chevronDown: 'M6 9l6 6 6-6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
};

const lessonIdOf = (lesson) => lesson?.id ?? lesson?.lessonId;
const assignmentIdOf = (assignment) => assignment?.id ?? assignment?.assignmentId;
const studentIdOf = (student) => student?.id ?? student?.studentId ?? student?.legacyId;
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

const AttendanceBadge = ({ attended }) => (
  <span className={`cd-attendance-dot ${attended ? 'is-on' : 'is-off'}`} />
);

const Tab = ({ label, active, onClick, count }) => (
  <button type="button" onClick={onClick} className={`cd-tab ${active ? 'active' : ''}`}>
    <span>{label}</span>
    {count !== undefined && <span className="cd-tab-count">({count})</span>}
  </button>
);

export default function CourseDetails() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const courseName = decodeURIComponent(courseId);

  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [attendedLessons, setAttendedLessons] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('lessons');

  const [enrollMsg, setEnrollMsg] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showEditQuizModal, setShowEditQuizModal] = useState(false);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const [showAddQuestionToQuizModal, setShowAddQuestionToQuizModal] = useState(false);

  const [newLesson, setNewLesson] = useState({ title: '', description: '' });
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '', attachment: null });
  const [newQuiz, setNewQuiz] = useState({ quizTitle: '', quizDuration: '', questions: [] });
  const [newQuestion, setNewQuestion] = useState({ type: 'MCQ', content: '', correctAnswer: '', choices: ['', '', '', ''] });
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedQuizForQuestion, setSelectedQuizForQuestion] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger' // 'danger' | 'warning'
  });

  // Toast notification state
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success' // 'success' | 'error'
  });

  // Track which quizzes have expanded questions
  const [expandedQuizzes, setExpandedQuizzes] = useState(new Set());

  const role = user?.legacyRole || user?.roles?.[0]?.name || '';
  const roleNormalized = String(role).toUpperCase();
  const isInstructor = roleNormalized.includes('INSTRUCTOR') || roleNormalized.includes('TEACHER');
  const isStudent = roleNormalized.includes('STUDENT');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type }), 3000);
  };

  const openConfirmModal = (title, message, onConfirm, type = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, type });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });
  };

  const toggleQuizExpansion = (quizId) => {
    setExpandedQuizzes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`/api/course/${encodeURIComponent(courseName)}/get-questions`);
      setQuestions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get(`/api/course/${encodeURIComponent(courseName)}/quizzes`);
      setQuizzes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [lessonsRes, assignRes, quizzesRes, enrolledRes] = await Promise.allSettled([
          axios.get(`/api/course/course/${encodeURIComponent(courseName)}/lessons`),
          axios.get(`/api/course/${encodeURIComponent(courseName)}/assignments`),
          axios.get(`/api/course/${encodeURIComponent(courseName)}/quizzes`),
          axios.get(`/api/course/course/${encodeURIComponent(courseName)}/enrolled`),
        ]);

        if (lessonsRes.status === 'fulfilled' && Array.isArray(lessonsRes.value.data)) {
          setLessons(lessonsRes.value.data);
        } else {
          setLessons([]);
        }

        if (assignRes.status === 'fulfilled') {
          const data = assignRes.value.data;
          if (Array.isArray(data)) {
            setAssignments(data);
          } else if (Array.isArray(data?.assignments)) {
            setAssignments(data.assignments);
          } else {
            setAssignments([]);
          }
        } else {
          setAssignments([]);
        }

        if (quizzesRes.status === 'fulfilled' && Array.isArray(quizzesRes.value.data)) {
          setQuizzes(quizzesRes.value.data);
        } else {
          setQuizzes([]);
        }

        if (enrolledRes.status === 'fulfilled' && Array.isArray(enrolledRes.value.data)) {
          const enrolled = enrolledRes.value.data;
          setEnrolledStudents(enrolled);
          // Check if current student is already enrolled
          if (isStudent && user) {
            const userEmail = user.email || user.sub;
            const userName = user.name || user.username;
            const found = enrolled.some(
              (s) => s.email === userEmail || s.name === userName || s.studentName === userName,
            );
            if (found) setIsEnrolled(true);
          }
        } else {
          setEnrolledStudents([]);
        }

        if (isInstructor) {
          fetchQuestions();
        }

        if (isStudent) {
          try {
            const attendedRes = await axios.get(
              `/api/course/course/${encodeURIComponent(courseName)}/attended-lessons`,
            );
            if (Array.isArray(attendedRes.data)) {
              setAttendedLessons(attendedRes.data);
            } else {
              setAttendedLessons([]);
            }
          } catch (err) {
            console.error('Error fetching attendance:', err);
            setAttendedLessons([]);
          }
        } else {
          setAttendedLessons([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [courseName, isInstructor, isStudent]);

  const tabs = useMemo(
    () => [
      { key: 'lessons', label: t('content.lessons'), count: lessons.length },
      { key: 'assignments', label: t('content.assignments'), count: assignments.length },
      { key: 'quizzes', label: t('content.quizzes'), count: quizzes.length },
      ...(isStudent ? [{ key: 'progress', label: t('content.my_progress') }] : []),
      ...(isInstructor
        ? [
            { key: 'students', label: t('content.students'), count: enrolledStudents.length },
            { key: 'tools', label: t('content.instructor_tools') },
          ]
        : []),
    ],
    [assignments.length, quizzes.length, enrolledStudents.length, isInstructor, isStudent, lessons.length, t],
  );

  useEffect(() => {
    if (!tabs.some((tabItem) => tabItem.key === tab)) {
      setTab('lessons');
    }
  }, [tab, tabs]);

  const handleEnroll = async () => {
    setEnrollLoading(true);
    setEnrollMsg('');
    try {
      await axios.post(`/api/course/course/${encodeURIComponent(courseName)}/enroll`);
      setEnrollMsg('success');
      setIsEnrolled(true);
    } catch (err) {
      setEnrollMsg(err.response?.data || 'Enrollment failed');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `/api/course/course/${encodeURIComponent(courseName)}/add-lesson`,
        newLesson,
      );
      setLessons((prev) => [...prev, res.data]);
      setShowLessonModal(false);
      setNewLesson({ title: '', description: '' });
    } catch (err) {
      alert('Failed to add lesson');
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      // Build payload matching backend Question entity:
      // { type: "MCQ"|"TF"|"ESSAY", content: "...", correctAnswer: "...", choices: [{value: "..."}] }
      const payload = {
        type: newQuestion.type,
        content: newQuestion.content,
        correctAnswer: newQuestion.correctAnswer,
        choices: newQuestion.choices.filter((c) => c.trim() !== '').map((c) => ({ value: c })),
      };
      await axios.post(`/api/course/${encodeURIComponent(courseName)}/create-question`, payload);
      fetchQuestions();
      setShowQuestionModal(false);
      setNewQuestion({ type: 'MCQ', content: '', correctAnswer: '', choices: ['', '', '', ''] });
    } catch (err) {
      alert(err.response?.data || 'Failed to add question');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', newAssignment.title);
      formData.append('description', newAssignment.description || '');
      formData.append('dueDate', newAssignment.dueDate);
      if (newAssignment.attachment) {
        formData.append('attachment', newAssignment.attachment);
      }

      const res = await axios.post(
        `/api/course/${encodeURIComponent(courseName)}/create-assignment`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setAssignments((prev) => [...prev, res.data]);
      setShowAssignmentModal(false);
      setNewAssignment({ title: '', description: '', dueDate: '', attachment: null });
    } catch (err) {
      alert('Failed to create assignment');
    }
  };

  const handleDownloadAssignmentAttachment = async (assignment) => {
    const assignmentId = assignmentIdOf(assignment);
    if (!assignmentId) {
      showToast('Assignment attachment is unavailable.', 'error');
      return;
    }

    try {
      const response = await axios.get(
        `/api/course/${encodeURIComponent(courseName)}/assignment/${assignmentId}/attachment`,
        { responseType: 'blob' },
      );

      const contentType = response.headers?.['content-type'] || assignment.attachmentFileType || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);

      const newTab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!newTab) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = assignment.attachmentFileName || `assignment_${assignmentId}_attachment`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      showToast('Failed to open assignment attachment.', 'error');
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/course/${encodeURIComponent(courseName)}/create-quiz`, newQuiz);
      fetchQuizzes();
      setShowQuizModal(false);
      setNewQuiz({ quizTitle: '', quizDuration: '', questions: [] });
      showToast('Quiz created and students notified!', 'success');
    } catch (err) {
      showToast('Failed to create quiz', 'error');
    }
  };

  const handleEditQuiz = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/course/${encodeURIComponent(courseName)}/quiz/${editingQuiz.quizID}`, editingQuiz);
      fetchQuizzes();
      setShowEditQuizModal(false);
      setEditingQuiz(null);
      showToast('Quiz updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update quiz', 'error');
    }
  };

  const handleDeleteQuiz = (quizId) => {
    openConfirmModal(
      'Delete Quiz',
      'Are you sure you want to delete this quiz? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`/api/course/${encodeURIComponent(courseName)}/quiz/${quizId}`);
          await fetchQuizzes();
          showToast('Quiz deleted successfully!', 'success');
        } catch (err) {
          showToast('Failed to delete quiz', 'error');
        }
        closeConfirmModal();
      },
      'danger'
    );
  };

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/course/${encodeURIComponent(courseName)}/question/${editingQuestion.id}`, editingQuestion);
      fetchQuestions();
      setShowEditQuestionModal(false);
      setEditingQuestion(null);
      showToast('Question updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update question', 'error');
    }
  };

  const handleDeleteQuestion = (questionId) => {
    openConfirmModal(
      'Delete Question',
      'Are you sure you want to delete this question from the question bank? This will remove it from all quizzes.',
      async () => {
        try {
          await axios.delete(`/api/course/${encodeURIComponent(courseName)}/question/${questionId}`);
          await fetchQuestions();
          await fetchQuizzes();
          showToast('Question deleted successfully!', 'success');
        } catch (err) {
          showToast('Failed to delete question', 'error');
        }
        closeConfirmModal();
      },
      'danger'
    );
  };

  const handleAddQuestionToQuiz = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/course/${encodeURIComponent(courseName)}/quiz/${selectedQuizForQuestion.quizID}/questions`, editingQuestion);
      await fetchQuizzes();
      setShowAddQuestionToQuizModal(false);
      setSelectedQuizForQuestion(null);
      setEditingQuestion(null);
      showToast('Question added to quiz successfully!', 'success');
    } catch (err) {
      showToast('Failed to add question to quiz', 'error');
    }
  };

  const handleRemoveQuestionFromQuiz = (quizId, questionId) => {
    openConfirmModal(
      'Remove Question from Quiz',
      'Are you sure you want to remove this question from the quiz? The question will remain in the question bank.',
      async () => {
        try {
          await axios.delete(`/api/course/${encodeURIComponent(courseName)}/quiz/${quizId}/questions/${questionId}`);
          await fetchQuizzes();
          showToast('Question removed from quiz successfully!', 'success');
        } catch (err) {
          showToast('Failed to remove question from quiz', 'error');
        }
        closeConfirmModal();
      },
      'warning'
    );
  };

  const attendanceRate = lessons.length
    ? Math.round((attendedLessons.length / lessons.length) * 100)
    : 0;
  const contextualSearchHref = `/education-search?q=${encodeURIComponent(courseName)}&provider=ALL&limit=8`;

  return (
    <div className="cd-page ctx-page-with-chat">
      <Link to="/courses" className="cd-back-link">
        <Icon d={icons.back} size={16} color="currentColor" />
        <span>{t('common.back_to')} {t('common.courses')}</span>
      </Link>

      <section className="cd-hero">
        <div className="cd-hero-orb cd-hero-orb-main" />
        <div className="cd-hero-orb cd-hero-orb-soft" />

        <div className="cd-hero-main">
          <div>
            <h1 className="cd-hero-title">{courseName}</h1>
            <div className="cd-hero-chips">
              <span className="cd-chip">{lessons.length} Lessons</span>
              <span className="cd-chip">{assignments.length} Assignments</span>
              <span className="cd-chip">{quizzes.length} Quizzes</span>
              {isInstructor && <span className="cd-chip">{enrolledStudents.length} Students</span>}
            </div>
          </div>

          {isStudent && !isEnrolled && (
            <button
              type="button"
              onClick={handleEnroll}
              disabled={enrollLoading}
              className="cd-enroll-btn"
            >
              {enrollLoading ? t('common.loading') : t('content.enroll_now')}
            </button>
          )}

          {isStudent && isEnrolled && (
            <span className="cd-enrolled-pill">
              <Icon d={icons.check} size={16} color="currentColor" />
              {t('content.enrolled')}
            </span>
          )}

          <Link to={`/courses/${encodeURIComponent(courseName)}/live`} className="cd-live-btn">
            <Icon d={icons.clock} size={15} color="currentColor" />
            {t('content.live_classroom')}
          </Link>
        </div>

        {enrollMsg && enrollMsg !== 'success' && <p className="cd-enroll-error">{enrollMsg}</p>}
      </section>

      <section
        className="glass-panel"
        style={{
          padding: '1rem 1.1rem',
          borderRadius: '16px',
          marginTop: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.85rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Contextual Learning Search</h3>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Search educational materials for <strong>{courseName}</strong> from Google and YouTube.
          </p>
        </div>
        <Link to={contextualSearchHref} className="cd-live-btn">
          <Icon d={icons.book} size={15} color="currentColor" />
          Find Materials
        </Link>
      </section>

      <div className="cd-tabs-wrap">
        {tabs.map((tabItem) => (
          <Tab
            key={tabItem.key}
            label={tabItem.label}
            count={tabItem.count}
            active={tab === tabItem.key}
            onClick={() => setTab(tabItem.key)}
          />
        ))}
      </div>

      {loading ? (
        <div className="cd-loading">Loading...</div>
      ) : (
        <>
          {tab === 'lessons' && (
            <section className="cd-stack">
              {lessons.length === 0 ? (
                <EmptyState icon={icons.book} message={t('content.no_lessons_yet')} />
              ) : (
                lessons.map((lesson, index) => {
                  const lessonId = lessonIdOf(lesson);
                  const attended = attendedLessons.some((entry) => lessonIdOf(entry) === lessonId);

                  return (
                    <Link
                      key={lessonId || index}
                      to={`/courses/${encodeURIComponent(courseName)}/lessons/${lessonId}`}
                      className="cd-item-link"
                    >
                      <article className="cd-item-card cd-item-card-lesson">
                        <div className="cd-item-index">{index + 1}</div>
                        <div className="cd-item-body">
                          <h3 className="cd-item-title">
                            {lesson.title || lesson.lessonTitle || `Lesson ${index + 1}`}
                          </h3>
                          <div className="cd-item-meta-row">
                            {attended && (
                              <span className="cd-attended-pill">
                                <Icon d={icons.check} size={12} color="currentColor" />
                                {t('content.attended')}
                              </span>
                            )}
                            {lesson.description && (
                              <p className="cd-item-description">{lesson.description}</p>
                            )}
                          </div>
                        </div>
                        <Icon d={icons.arrow} size={18} color="currentColor" />
                      </article>
                    </Link>
                  );
                })
              )}
            </section>
          )}

          {tab === 'assignments' && (
            <section className="cd-stack">
              {assignments.length === 0 ? (
                <EmptyState icon={icons.assign} message="No assignments for this course yet." />
              ) : (
                assignments.map((assignment, index) => {
                  const assignmentId = assignmentIdOf(assignment);
                  const dueDate = assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleDateString()
                    : null;

                  return (
                    <article key={assignmentId || index} className="cd-item-card cd-item-card-assignment">
                      <div className="cd-item-icon">
                        <Icon d={icons.assign} size={20} color="currentColor" />
                      </div>
                      <div className="cd-item-body">
                        <h3 className="cd-item-title">
                          {assignment.title || assignment.assignmentTitle || `Assignment ${index + 1}`}
                        </h3>

                        {assignment.description && (
                          <p className="cd-assignment-description">{assignment.description}</p>
                        )}

                        <div className="cd-badge-row">
                          {dueDate && (
                            <span className="cd-badge cd-badge-due">
                              <Icon d={icons.clock} size={12} color="currentColor" />
                              Due: {dueDate}
                            </span>
                          )}

                          {isStudent && (
                            <Link
                              to={`/courses/${encodeURIComponent(courseName)}/assignment/${assignmentId}`}
                              className="cd-badge cd-badge-action"
                            >
                              {t('content.submit_now')}
                            </Link>
                          )}

                          {assignment.hasAttachment && (
                            <button
                              type="button"
                              className="cd-badge cd-badge-manage"
                              onClick={() => handleDownloadAssignmentAttachment(assignment)}
                            >
                              <Icon d={icons.file} size={12} color="currentColor" />
                              {attachmentTypeLabelOf(assignment)} • {t('content.download_attachment')}
                            </button>
                          )}

                          {isInstructor && (
                            <Link
                              to={`/courses/${encodeURIComponent(courseName)}/assignment/${assignmentId}/submissions`}
                              className="cd-badge cd-badge-manage"
                            >
                              {t('content.view_submissions')}
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          )}

          {tab === 'quizzes' && (
            <section className="cd-stack">
              {quizzes.length === 0 ? (
                <EmptyState icon={icons.quiz} message="No quizzes for this course yet." />
              ) : (
                quizzes.map((quiz, index) => {
                  const quizId = quiz.quizID || quiz.id;
                  return (
                    <article key={quizId || index} className="cd-item-card cd-item-card-quiz">
                      <div className="cd-item-icon">
                        <Icon d={icons.quiz} size={20} color="currentColor" />
                      </div>
                      <div className="cd-item-body">
                        <h3 className="cd-item-title">{quiz.quizTitle || `Quiz ${index + 1}`}</h3>
                        <div className="cd-item-meta-row">
                          {quiz.quizDuration && (
                            <span className="cd-meta-item">
                              <Icon d={icons.clock} size={14} color="currentColor" />
                              {t('content.duration')}: {quiz.quizDuration}
                            </span>
                          )}
                          {quiz.questionCount != null && (
                            <span className="cd-meta-item">
                              {quiz.questionCount} {t('content.questions')}
                            </span>
                          )}
                          {isInstructor && quiz.submissionCount != null && (
                            <span className="cd-meta-item">
                              {quiz.submissionCount} {t('content.submissions')}
                            </span>
                          )}
                        </div>
                        
                        {/* Instructor Actions for Quiz */}
                        {isInstructor && (
                          <div className="cd-quiz-actions">
                            <button
                              className="cd-btn cd-btn-sm cd-btn-secondary"
                              onClick={() => { setEditingQuiz(quiz); setShowEditQuizModal(true); }}
                            >
                              {t('content.edit_quiz')}
                            </button>
                            <button
                              className="cd-btn cd-btn-sm cd-btn-secondary"
                              onClick={() => { setSelectedQuizForQuestion(quiz); setShowAddQuestionToQuizModal(true); }}
                            >
                              {t('content.add_question')}
                            </button>
                            <button
                              className="cd-btn cd-btn-sm cd-btn-danger"
                              onClick={() => handleDeleteQuiz(quizId)}
                            >
                              {t('content.delete_quiz')}
                            </button>
                          </div>
                        )}
                        
                        {/* View Questions Toggle */}
                        {quiz.questions && quiz.questions.length > 0 && (
                          <button
                            className="cd-quiz-toggle"
                            onClick={() => toggleQuizExpansion(quizId)}
                            aria-expanded={expandedQuizzes.has(quizId)}
                          >
                            <span className="cd-toggle-text">
                              {expandedQuizzes.has(quizId) ? t('content.hide_questions') : `${t('content.view_questions')} (${quiz.questions.length})`}
                            </span>
                            <span className={`cd-toggle-icon ${expandedQuizzes.has(quizId) ? 'expanded' : ''}`}>
                              <Icon d={icons.chevronDown} size={16} color="currentColor" />
                            </span>
                          </button>
                        )}
                        
                        {/* Display questions under quiz - conditionally rendered */}
                        {quiz.questions && quiz.questions.length > 0 && expandedQuizzes.has(quizId) && (
                          <div className="cd-quiz-questions animate-fade-in">
                            <p className="cd-questions-title">Questions:</p>
                            <div className="cd-questions-list">
                              {quiz.questions.map((question, qIndex) => (
                                <div key={question.id || qIndex} className="cd-question-item">
                                  <span className="cd-question-number">{qIndex + 1}.</span>
                                  <div className="cd-question-content">
                                    <p className="cd-question-text">{question.content}</p>
                                    <span className="cd-question-type">{question.type}</span>
                                    {question.choices && question.choices.length > 0 && (
                                      <div className="cd-question-choices">
                                        {question.choices.map((choice, cIndex) => {
                                          const choiceValue = choice?.value;
                                          const letter = String.fromCharCode(65 + cIndex);
                                          const displayText = choiceValue || `Option ${letter}`;
                                          return (
                                            <span key={cIndex} className={`cd-choice-item ${!choiceValue ? 'placeholder' : ''}`}>
                                              <strong className="cd-choice-letter">{letter}.</strong> {displayText}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {/* Question Actions for Instructor */}
                                    {isInstructor && (
                                      <div className="cd-question-actions">
                                        <button
                                          className="cd-btn cd-btn-xs cd-btn-secondary"
                                          onClick={() => { setEditingQuestion(question); setShowEditQuestionModal(true); }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          className="cd-btn cd-btn-xs cd-btn-danger"
                                          onClick={() => handleRemoveQuestionFromQuiz(quizId, question.id)}
                                        >
                                          {t('common.remove')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="cd-badge-row">
                          {isStudent && (
                            <Link
                              to={`/courses/${encodeURIComponent(courseName)}/quiz/${encodeURIComponent(quiz.quizTitle)}`}
                              className="cd-badge cd-badge-action"
                            >
                              {t('content.start_quiz')}
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          )}

          {tab === 'progress' && isStudent && (
            <section className="cd-progress-wrap">
              <article className="cd-progress-card">
                <h3>{t('content.attendance_list')}</h3>

                <div className="cd-progress-summary">
                  <div className="cd-progress-value">{attendanceRate}%</div>
                  <div>
                    <p className="cd-progress-title">{t('progress.attendance')}</p>
                    <p className="cd-progress-subtitle">
                      {attendedLessons.length} of {lessons.length} lessons attended
                    </p>
                  </div>
                </div>

                <div className="cd-progress-grid">
                  {lessons.map((lesson, index) => {
                    const attended = attendedLessons.some(
                      (entry) => lessonIdOf(entry) === lessonIdOf(lesson),
                    );
                    return (
                      <div key={lessonIdOf(lesson) || index} className="cd-progress-item">
                        <AttendanceBadge attended={attended} />
                        <span className={attended ? '' : 'is-muted'}>
                          {lesson.title || lesson.lessonTitle || `Lesson ${index + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>
          )}

          {tab === 'students' && isInstructor && (
            <section className="cd-students-wrap">
              {enrolledStudents.length === 0 ? (
                <EmptyState icon={icons.users} message={t('content.students') + " " + t('common.not_found')} />
              ) : (
                <div className="cd-student-panel">
                  <header>
                    <h3>{t('content.students')} ({enrolledStudents.length})</h3>
                  </header>
                  {enrolledStudents.map((student, index) => (
                    <div className="cd-student-row" key={studentIdOf(student) || index}>
                      <div className="cd-student-avatar">
                        {(student.name || student.studentName || 'S')[0]?.toUpperCase()}
                      </div>
                      <div className="cd-student-main">
                        <p>{student.name || student.studentName || 'Student'}</p>
                        <span>{student.email || ''}</span>
                      </div>
                      <RemoveStudentBtn
                        courseName={courseName}
                        studentId={studentIdOf(student)}
                        studentName={student.name || student.studentName || 'Student'}
                        onRemove={() =>
                          setEnrolledStudents((prev) =>
                            prev.filter((entry) => studentIdOf(entry) !== studentIdOf(student)),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'tools' && isInstructor && (
            <section className="cd-tools-wrap">
              <button
                type="button"
                onClick={() => setShowLessonModal(true)}
                className="cd-tool-card"
                style={{ '--cd-tool-color': '#3b82f6' }}
              >
                <span className="cd-tool-icon">
                  <Icon d={icons.plus} size={24} color="currentColor" />
                </span>
                <h4>{t('common.add')} {t('common.new')} {t('common.lesson')}</h4>
                <p>Add video content, slides, or reading material.</p>
              </button>

              <button
                type="button"
                onClick={() => setShowAssignmentModal(true)}
                className="cd-tool-card"
                style={{ '--cd-tool-color': '#ec4899' }}
              >
                <span className="cd-tool-icon">
                  <Icon d={icons.plus} size={24} color="currentColor" />
                </span>
                <h4>{t('common.create')} {t('content.assignments')}</h4>
                <p>Set deadlines and PDF submission requirements.</p>
              </button>

              <button
                type="button"
                onClick={() => setShowQuestionModal(true)}
                className="cd-tool-card"
                style={{ '--cd-tool-color': '#f59e0b' }}
              >
                <span className="cd-tool-icon">
                  <Icon d={icons.plus} size={24} color="currentColor" />
                </span>
                <h4>{t('content.add_question')}</h4>
                <p>Build a library of questions for your quizzes.</p>
              </button>

              <button
                type="button"
                onClick={() => setShowQuizModal(true)}
                className="cd-tool-card"
                style={{ '--cd-tool-color': '#10b981' }}
              >
                <span className="cd-tool-icon">
                  <Icon d={icons.quiz} size={24} color="currentColor" />
                </span>
                <h4>{t('common.launch')} {t('common.quiz')}</h4>
                <p>Create a quiz from your question bank.</p>
              </button>

              <section className="cd-question-bank">
                <h3>Local Question Bank</h3>
                  {questions.length === 0 ? (
                    <p className="cd-question-empty">
                      {t('common.no_questions_yet')}
                    </p>
                  ) : (
                    <div className="cd-question-list">
                    {questions.map((question, index) => (
                      <article key={question.id || index} className="cd-question-item">
                        <p>
                          <strong>Q{index + 1} ({question.type}):</strong> {question.content}
                        </p>
                        <div className="cd-choice-row">
                          {(question.choices || []).map((choice, choiceIndex) => {
                            const choiceValue = typeof choice === 'object' ? choice?.value : choice;
                            const letter = String.fromCharCode(65 + choiceIndex);
                            const displayText = choiceValue || `Option ${letter}`;
                            return (
                              <span
                                key={choice?.id || choiceIndex}
                                className={`cd-choice-pill ${!choiceValue ? 'placeholder' : ''} ${
                                  question.correctAnswer === choiceValue ? 'is-correct' : ''
                                }`}
                              >
                                <strong className="cd-choice-letter">{letter}.</strong> {displayText}
                              </span>
                            );
                          })}
                        </div>
                        {/* Question Bank Actions */}
                        <div className="cd-question-actions">
                          <button
                            className="cd-btn cd-btn-xs cd-btn-secondary"
                            onClick={() => { setEditingQuestion(question); setShowEditQuestionModal(true); }}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            className="cd-btn cd-btn-xs cd-btn-danger"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>
          )}
        </>
      )}

      <ContextChatWidget
        contextType="COURSE"
        contextKey={courseName}
        title="Course Community Chat"
        subtitle="Teachers and students can discuss announcements, lessons, and help."
      />

      {showLessonModal && (
        <Modal title={t('common.add') + " " + t('common.lesson')} onClose={() => setShowLessonModal(false)}>
          <form onSubmit={handleAddLesson} className="cd-modal-form">
            <input
              type="text"
              placeholder={t('common.lesson') + " " + t('common.title')}
              className="input premium-input"
              required
              value={newLesson.title}
              onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              rows="3"
              className="input premium-input"
              value={newLesson.description}
              onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
            />
            <button type="submit" className="btn btn-primary cd-full-btn">
              {t('common.add')} {t('common.lesson')}
            </button>
          </form>
        </Modal>
      )}

      {showAssignmentModal && (
        <Modal title="Create Assignment" onClose={() => setShowAssignmentModal(false)}>
          <form onSubmit={handleCreateAssignment} className="cd-modal-form">
            <input
              type="text"
              placeholder="Assignment Title"
              className="input premium-input"
              required
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              rows="3"
              className="input premium-input"
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            />
            <input
              type="datetime-local"
              className="input premium-input"
              required
              value={newAssignment.dueDate}
              onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
            />
            <input
              type="file"
              className="input premium-input"
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, attachment: e.target.files?.[0] || null })
              }
            />
            <button type="submit" className="btn btn-primary cd-full-btn">
              {t('common.create')} {t('content.assignments')}
            </button>
          </form>
        </Modal>
      )}

      {showQuestionModal && (
        <Modal title={t('content.add_question')} onClose={() => setShowQuestionModal(false)}>
          <form onSubmit={handleAddQuestion} className="cd-modal-form">
            {/* Question Type */}
            <select
              className="input premium-input"
              required
              value={newQuestion.type}
              onChange={(e) => {
                const type = e.target.value;
                setNewQuestion({
                  ...newQuestion,
                  type,
                  choices: type === 'TF' ? ['True', 'False'] : ['', '', '', ''],
                  correctAnswer: '',
                });
              }}
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="TF">True / False</option>
              <option value="ESSAY">Essay</option>
            </select>

            {/* Question Content */}
            <textarea
              placeholder="Question text"
              rows="2"
              className="input premium-input"
              required
              value={newQuestion.content}
              onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
            />

            {/* Choices (MCQ or TF) */}
            {newQuestion.type !== 'ESSAY' &&
              newQuestion.choices.map((choice, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Choice ${index + 1}`}
                  className="input premium-input"
                  required
                  value={choice}
                  readOnly={newQuestion.type === 'TF'}
                  onChange={(e) => {
                    const nextChoices = [...newQuestion.choices];
                    nextChoices[index] = e.target.value;
                    setNewQuestion({ ...newQuestion, choices: nextChoices });
                  }}
                />
              ))}

            {/* Correct Answer */}
            {newQuestion.type !== 'ESSAY' && (
              <select
                className="input premium-input"
                required
                value={newQuestion.correctAnswer}
                onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
              >
                <option value="">Select Correct Answer</option>
                {newQuestion.choices.map(
                  (choice, index) =>
                    choice && (
                      <option key={index} value={choice}>
                        {choice}
                      </option>
                    ),
                )}
              </select>
            )}

            <button type="submit" className="btn btn-primary cd-full-btn">
              {t('common.add')} {t('common.to')} {t('common.bank')}
            </button>
          </form>
        </Modal>
      )}

      {showQuizModal && (
        <Modal title={t('common.launch') + " " + t('common.quiz')} onClose={() => setShowQuizModal(false)}>
          <form onSubmit={handleCreateQuiz} className="cd-modal-form">
            <input
              type="text"
              placeholder="Quiz Title"
              className="input premium-input"
              required
              value={newQuiz.quizTitle}
              onChange={(e) => setNewQuiz({ ...newQuiz, quizTitle: e.target.value })}
            />

            <input
              type="text"
              placeholder="Duration (e.g., 30 minutes)"
              className="input premium-input"
              value={newQuiz.quizDuration}
              onChange={(e) => setNewQuiz({ ...newQuiz, quizDuration: e.target.value })}
            />

            <p className="cd-modal-subtitle">Select questions from bank:</p>
            <div className="cd-quiz-pick-list">
              {questions.map((question, index) => {
                const checked = newQuiz.questions.some(
                  (entry) => (entry.id || entry.content) === (question.id || question.content),
                );

                return (
                  <label key={question.id || index} className="cd-quiz-pick-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextQuestions = e.target.checked
                          ? [...newQuiz.questions, question]
                          : newQuiz.questions.filter(
                              (entry) => (entry.id || entry.content) !== (question.id || question.content),
                            );
                        setNewQuiz({ ...newQuiz, questions: nextQuestions });
                      }}
                    />
                    <span>[{question.type}] {question.content}</span>
                  </label>
                );
              })}
            </div>

            <button type="submit" className="btn btn-primary cd-full-btn">
              {t('common.create')} {t('common.quiz')}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Quiz Modal */}
      {showEditQuizModal && editingQuiz && (
        <Modal title={t('content.edit_quiz')} onClose={() => { setShowEditQuizModal(false); setEditingQuiz(null); }}>
          <form onSubmit={handleEditQuiz} className="cd-modal-form">
            <input
              type="text"
              placeholder="Quiz Title"
              className="input premium-input"
              required
              value={editingQuiz.quizTitle || ''}
              onChange={(e) => setEditingQuiz({ ...editingQuiz, quizTitle: e.target.value })}
            />

            <input
              type="text"
              placeholder="Duration (e.g., 30 minutes)"
              className="input premium-input"
              value={editingQuiz.quizDuration || ''}
              onChange={(e) => setEditingQuiz({ ...editingQuiz, quizDuration: e.target.value })}
            />

            <button type="submit" className="btn btn-primary cd-full-btn">
              {t('common.update')} {t('common.quiz')}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Question Modal */}
      {showEditQuestionModal && editingQuestion && (
        <Modal title="Edit Question" onClose={() => { setShowEditQuestionModal(false); setEditingQuestion(null); }}>
          <form onSubmit={handleEditQuestion} className="cd-modal-form">
            <select
              className="input premium-input"
              value={editingQuestion.type || 'MCQ'}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value })}
            >
              <option value="MCQ">Multiple Choice</option>
              <option value="TRUE_FALSE">True/False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
            </select>

            <textarea
              placeholder="Question Content"
              className="input premium-input"
              required
              value={editingQuestion.content || ''}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
            />

            <input
              type="text"
              placeholder="Correct Answer"
              className="input premium-input"
              value={editingQuestion.correctAnswer || ''}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
            />

            {editingQuestion.type === 'MCQ' && (
              <div className="cd-choices-section">
                <p className="cd-modal-subtitle">Choices:</p>
                {(editingQuestion.choices || []).map((choice, index) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={`Choice ${index + 1}`}
                    className="input premium-input"
                    value={typeof choice === 'object' ? choice?.value || '' : choice}
                    onChange={(e) => {
                      const newChoices = [...(editingQuestion.choices || [])];
                      newChoices[index] = { value: e.target.value };
                      setEditingQuestion({ ...editingQuestion, choices: newChoices });
                    }}
                  />
                ))}
              </div>
            )}

            <button type="submit" className="btn btn-primary cd-full-btn">
              Update Question
            </button>
          </form>
        </Modal>
      )}

      {/* Add Question to Quiz Modal */}
      {showAddQuestionToQuizModal && selectedQuizForQuestion && (
        <Modal title={`Add Question to: ${selectedQuizForQuestion.quizTitle}`} onClose={() => { setShowAddQuestionToQuizModal(false); setSelectedQuizForQuestion(null); }}>
          <form onSubmit={handleAddQuestionToQuiz} className="cd-modal-form">
            <p className="cd-modal-subtitle">Select questions to add:</p>
            <div className="cd-quiz-pick-list">
              {questions.map((question, index) => (
                <label key={question.id || index} className="cd-quiz-pick-item">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditingQuestion(question);
                      }
                    }}
                  />
                  <span>[{question.type}] {question.content}</span>
                </label>
              ))}
            </div>

            <button type="submit" className="btn btn-primary cd-full-btn">
              Add Selected Question
            </button>
          </form>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <Modal title={confirmModal.title} onClose={closeConfirmModal}>
          <div className="cd-confirm-modal">
            <div className={`cd-confirm-icon ${confirmModal.type}`}>
              <Icon d={confirmModal.type === 'danger' ? icons.warning : icons.info} size={48} color="currentColor" />
            </div>
            <p className="cd-confirm-message">{confirmModal.message}</p>
            <div className="cd-confirm-actions">
              <button className="cd-btn cd-btn-secondary" onClick={closeConfirmModal}>
                Cancel
              </button>
              <button
                className={`cd-btn ${confirmModal.type === 'danger' ? 'cd-btn-danger' : 'cd-btn-warning'}`}
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.type === 'danger' ? t('common.delete') : t('common.remove')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`cd-toast cd-toast-${toast.type} animate-slide-in`}>
          <div className="cd-toast-icon">
            <Icon d={toast.type === 'success' ? icons.check : icons.warning} size={20} color="currentColor" />
          </div>
          <span className="cd-toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="cd-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="cd-modal animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cd-modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function RemoveStudentBtn({ courseName, studentId, studentName, onRemove }) {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!studentId) {
      return;
    }

    if (!window.confirm(`Remove ${studentName} from this course?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(
        `/api/course/course/${encodeURIComponent(courseName)}/remove-student/${studentId}`,
      );
      onRemove();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleRemove} disabled={loading || !studentId} className="cd-student-remove">
      {loading ? '...' : t('common.remove')}
    </button>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="cd-empty">
      <Icon d={icon} size={44} color="currentColor" />
      <p>{message}</p>
    </div>
  );
}
