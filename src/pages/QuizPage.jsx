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
  quiz: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  check: 'M20 6L9 17l-5-5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
};

const questionIdOf = (question, index) => question?.questionId ?? question?.id ?? index;
const questionTextOf = (question) =>
  question?.questionText || question?.question || question?.text || question?.content || '';
const choicesOf = (question) => {
  const explicitChoices = question?.choices || question?.options || [];
  if (Array.isArray(explicitChoices) && explicitChoices.length > 0) {
    return explicitChoices;
  }

  const type = String(question?.type || '').toUpperCase();
  if (type === 'TF' || type === 'TRUE_FALSE') {
    return ['True', 'False'];
  }

  return [];
};

export default function QuizPage() {
  const { courseId, quizName } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();

  const courseName = decodeURIComponent(courseId);
  const decodedQuizName = decodeURIComponent(quizName);

  const role = user?.legacyRole || user?.roles?.[0]?.name || '';
  const roleNormalized = String(role).toUpperCase();
  const isStudent = roleNormalized.includes('STUDENT');

  const [phase, setPhase] = useState('idle'); // idle | taking | submitted | graded
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [grade, setGrade] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptLocked, setAttemptLocked] = useState(false);

  const questions = useMemo(() => {
    if (Array.isArray(quizData?.questions)) {
      return quizData.questions;
    }
    if (Array.isArray(quizData?.quiz?.questions)) {
      return quizData.quiz.questions;
    }
    if (Array.isArray(quizData)) {
      return quizData;
    }
    return [];
  }, [quizData]);

  const answeredCount = useMemo(
    () =>
      questions.reduce((count, question, index) => {
        const questionId = questionIdOf(question, index);
        const value = answers[questionId];
        if (typeof value === 'string' && value.trim().length > 0) {
          return count + 1;
        }
        return count;
      }, 0),
    [answers, questions],
  );

  const fetchGrade = async () => {
    try {
      const response = await axios.get(
        `/api/course/${encodeURIComponent(courseName)}/${encodeURIComponent(decodedQuizName)}/grade`,
      );
      setGrade(response.data);
      setError('');
      setPhase('graded');
      return true;
    } catch (err) {
      setError('Your attempt is recorded, but the grade is not available yet.');
      setPhase('submitted');
      return false;
    }
  };

  const handleViewGrade = async () => {
    setLoading(true);
    setError('');
    await fetchGrade();
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const checkAttemptStatus = async () => {
      if (!isStudent) {
        return;
      }

      try {
        const response = await axios.get(
          `/api/course/${encodeURIComponent(courseName)}/${encodeURIComponent(decodedQuizName)}/grade`,
        );

        if (cancelled) {
          return;
        }

        if (typeof response.data === 'number') {
          setGrade(response.data);
        }
        setAttemptLocked(true);
        setError('You already attempted this quiz. View your grade instead.');
      } catch (err) {
        if (cancelled) {
          return;
        }

        const message =
          typeof err.response?.data === 'string' ? err.response.data.toLowerCase() : '';
        const noSubmissionYet =
          message.includes('no submission') ||
          message.includes('no submission for this student');

        if (noSubmissionYet) {
          setAttemptLocked(false);
          setError('');
          return;
        }

        setAttemptLocked(false);
      }
    };

    checkAttemptStatus();
    return () => {
      cancelled = true;
    };
  }, [courseName, decodedQuizName, isStudent]);

  const startQuiz = async () => {
    setLoading(true);
    setError('');
    setAttemptLocked(false);
    try {
      const response = await axios.get(
        `/api/course/${encodeURIComponent(courseName)}/${encodeURIComponent(decodedQuizName)}/take-quiz`,
      );
      setQuizData(response.data);
      setAnswers({});
      setGrade(null);
      setPhase('taking');
    } catch (err) {
      if (err.response?.status === 409) {
        setAttemptLocked(true);
        setError('You already attempted this quiz. View your grade instead.');
      } else {
        setError(err.response?.data || 'Failed to load quiz.');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!questions.length) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = questions.map((question, index) => {
        const questionId = questionIdOf(question, index);
        return {
          submittedQuestionId: 0,
          studentAnswer: answers[questionId] || '',
          question: { id: questionId },
        };
      });

      await axios.post(
        `/api/course/${encodeURIComponent(courseName)}/${encodeURIComponent(decodedQuizName)}/submit-quiz`,
        payload,
      );

      setPhase('submitted');
      setTimeout(fetchGrade, 500);
    } catch (err) {
      setError(err.response?.data || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  return (
    <div className="qz-page ctx-page-with-chat">
      <div className="qz-breadcrumb">
        <Link to="/courses" className="qz-crumb-link">
          {t('common.courses')}
        </Link>
        <span className="qz-crumb-sep">/</span>
        <Link to={`/courses/${encodeURIComponent(courseId)}`} className="qz-crumb-link">
          {courseName}
        </Link>
        <span className="qz-crumb-sep">/</span>
        <span className="qz-crumb-current">Quiz: {decodedQuizName}</span>
      </div>

      <section className="qz-hero">
        <div>
          <h1>{decodedQuizName}</h1>
          <p>{courseName}</p>

          {phase === 'taking' && (
            <div className="qz-hero-chips">
              <span className="qz-chip">{questions.length} {t('content.questions')}</span>
              <span className={`qz-chip ${answeredCount === questions.length && questions.length ? 'is-done' : ''}`}>
                {answeredCount}/{questions.length} {t('content.answered')}
              </span>
            </div>
          )}
        </div>

        <span className="qz-hero-icon">
          <Icon d={icons.quiz} size={40} color="currentColor" />
        </span>
      </section>

      {phase === 'idle' && (
        <section className="qz-idle-card">
          <span className="qz-idle-icon">
            <Icon d={icons.quiz} size={34} color="currentColor" />
          </span>

          <h2>{t('content.quiz_ready')}</h2>
          <p>{t('content.questions')} {t('common.assigned')} {t('common.to')} {t('common.quiz')}</p>

          {error && <p className="qz-error-box">{error}</p>}

          {isStudent ? (
            <>
              {!attemptLocked && (
                <button
                  type="button"
                  onClick={startQuiz}
                  disabled={loading}
                  className="btn btn-primary qz-primary-btn"
                >
                  {loading ? t('common.loading') : t('content.start_quiz')}
                </button>
              )}
              {attemptLocked && (
                <button
                  type="button"
                  onClick={handleViewGrade}
                  disabled={loading}
                  className="btn btn-secondary qz-back-btn"
                >
                  {loading ? t('common.loading') : t('content.view_grade')}
                </button>
              )}
            </>
          ) : (
            <p className="qz-note">Only students can take quizzes.</p>
          )}
        </section>
      )}

      {phase === 'taking' && (
        <section className="qz-taking-wrap">
          {questions.map((question, index) => {
            const questionId = questionIdOf(question, index);
            const questionText = questionTextOf(question);
            const choiceList = choicesOf(question);
            const hasAnswer = typeof answers[questionId] === 'string' && answers[questionId].trim().length > 0;

            return (
              <article key={questionId} className={`qz-question-card ${hasAnswer ? 'is-answered' : ''}`}>
                <div className="qz-question-head">
                  <span className="qz-question-index">
                    {hasAnswer ? <Icon d={icons.check} size={14} color="currentColor" /> : index + 1}
                  </span>
                  <p>{questionText}</p>
                </div>

                {choiceList.length > 0 ? (
                  <div className="qz-choice-list">
                    {choiceList.map((choice, choiceIndex) => {
                      const value =
                        typeof choice === 'string' ? choice : choice?.text || choice?.value || String(choice);
                      const selected = answers[questionId] === value;

                      return (
                        <label key={choiceIndex} className={`qz-choice-item ${selected ? 'is-selected' : ''}`}>
                          <input
                            type="radio"
                            name={`q-${questionId}`}
                            value={value}
                            checked={selected}
                            onChange={() => setAnswer(questionId, value)}
                          />
                          <span>{value}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="qz-text-wrap">
                    <textarea
                      placeholder="Type your answer here..."
                      value={answers[questionId] || ''}
                      onChange={(event) => setAnswer(questionId, event.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </article>
            );
          })}

          {error && <p className="qz-error-box qz-error-inline">{error}</p>}

          <div className="qz-submit-row">
            <span className="qz-submit-count">
              <Icon d={icons.clock} size={14} color="currentColor" />
              {answeredCount}/{questions.length} {t('content.answered')}
            </span>

            <button
              type="button"
              onClick={submitQuiz}
              disabled={loading || answeredCount === 0}
              className="btn btn-primary qz-primary-btn"
            >
              {loading ? t('common.loading') : (
                <>
                  <Icon d={icons.send} size={16} color="currentColor" />
                  {t('content.submit_quiz')}
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {(phase === 'submitted' || phase === 'graded') && (
        <section className="qz-result-card">
          {grade !== null ? (
            <>
              <span className={`qz-result-score ${grade >= 50 ? 'is-pass' : 'is-fail'}`}>
                <strong>{grade}%</strong>
              </span>

              <h2>
                {grade >= 70 ? t('content.excellent') : grade >= 50 ? t('content.good') : t('content.keep_practicing')}
              </h2>
              <p>
                {t('common.you')} {t('common.scored')} <strong>{grade}%</strong> {t('common.on')} {t('common.quiz')}.
              </p>
            </>
          ) : (
            <>
              <span className="qz-result-wait">
                <Icon d={icons.check} size={32} color="currentColor" />
              </span>
              <h2>{t('content.submit_quiz')} {t('common.success')}</h2>
              <p>{t('content.results_processed')}</p>
            </>
          )}

          <Link to={`/courses/${encodeURIComponent(courseId)}`} className="btn btn-secondary qz-back-btn">
            {t('common.back_to')} {t('common.course')}
          </Link>
        </section>
      )}

      <ContextChatWidget
        contextType="QUIZ"
        contextKey={`${courseName}::${decodedQuizName}`}
        title="Quiz Discussion"
        subtitle="Talk about quiz instructions, clarifications, and learning tips."
      />
    </div>
  );
}
