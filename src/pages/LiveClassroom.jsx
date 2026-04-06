import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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
  live: 'M2 12h2m16 0h2M12 2v2m0 16v2M5.64 5.64l1.41 1.41m9.9 9.9 1.41 1.41M18.36 5.64l-1.41 1.41m-9.9 9.9-1.41 1.41M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  play: 'M5 3l14 9-14 9V3z',
  stop: 'M6 6h12v12H6z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18',
  external: 'M14 3h7v7M10 14L21 3M21 14v7h-7M3 10V3h7M3 3l7 7',
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function LiveClassroom() {
  const { courseId } = useParams();
  const location = useLocation();
  const courseName = decodeURIComponent(courseId);
  const { user } = useAuth();

  const role = user?.legacyRole || user?.roles?.[0]?.name || '';
  const roleNormalized = String(role).toUpperCase();
  const isInstructor = roleNormalized.includes('INSTRUCTOR') || roleNormalized.includes('TEACHER');
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [embed, setEmbed] = useState(false);
  const lastActivityEventRef = useRef({ type: '', timestamp: 0 });
  const activityReporterRef = useRef(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const [activeRes, historyRes] = await Promise.allSettled([
        axios.get(`/api/live/course/${encodeURIComponent(courseName)}/sessions/active`),
        axios.get(`/api/live/course/${encodeURIComponent(courseName)}/sessions`),
      ]);

      if (activeRes.status === 'fulfilled') {
        setActiveSession(activeRes.value.data);
      } else {
        setActiveSession(null);
      }

      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data)) {
        setHistory(historyRes.value.data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      setError(err.response?.data || 'Unable to load live classroom data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [courseName]);

  useEffect(() => {
    if (isInstructor && activeSession?.id) {
      const fetchAlerts = async () => {
        try {
          const response = await axios.get('/api/users/notifications');
          const all = Array.isArray(response.data) ? response.data : [];
          const filtered = all
            .filter((item) => {
              const message = item?.Message || item?.message || '';
              return (
                message.includes('[Live Session Activity]') &&
                message.includes(`sid=${activeSession.id}`)
              );
            })
            .slice(0, 12);
          setLiveAlerts(filtered);
        } catch (_) {
          setLiveAlerts([]);
        }
      };

      fetchAlerts();
      const timer = window.setInterval(fetchAlerts, 5000);
      return () => window.clearInterval(timer);
    }
    setLiveAlerts([]);
    return undefined;
  }, [isInstructor, activeSession?.id, courseName]);

  useEffect(() => {
    if (isInstructor || !activeSession?.id) {
      return;
    }

    const now = Date.now();
    const withinThrottleWindow = now - lastActivityEventRef.current.timestamp < 8000;

    const sendActivity = (eventType, useKeepalive = false) => {
      const thisMoment = Date.now();
      if (
        lastActivityEventRef.current.type === eventType &&
        thisMoment - lastActivityEventRef.current.timestamp < 8000
      ) {
        return;
      }
      lastActivityEventRef.current = { type: eventType, timestamp: thisMoment };

      const payload = {
        eventType,
        pageUrl: window.location.href,
        pageTitle: document.title,
        visibilityState: document.visibilityState,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        userAgent: navigator.userAgent,
        platform: navigator.platform || 'unknown',
        referrer: document.referrer || '',
      };

      const endpoint = `/api/live/course/${encodeURIComponent(courseName)}/sessions/${activeSession.id}/activity`;
      const token = localStorage.getItem('token');
      const baseUrl = axios.defaults.baseURL || '';
      const finalUrl = `${baseUrl}${endpoint}`;

      if (useKeepalive) {
        fetch(finalUrl, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }).catch(() => {});
        return;
      }

      axios.post(endpoint, payload).catch(() => {});
    };

    activityReporterRef.current = sendActivity;

    if (!withinThrottleWindow) {
      sendActivity('LIVE_PAGE_ACTIVE');
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendActivity('TAB_HIDDEN_OR_SWITCHED');
      }
    };

    const onWindowBlur = () => {
      sendActivity('WINDOW_BLUR');
    };

    const onPageHide = () => {
      sendActivity('PAGEHIDE_OR_NAVIGATION', true);
    };

    const hiddenPulse = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        sendActivity('TAB_HIDDEN_PULSE');
      }
    }, 15000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    return () => {
      sendActivity('LEFT_LIVE_CLASSROOM_ROUTE', true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      window.clearInterval(hiddenPulse);
    };
  }, [activeSession?.id, courseName, isInstructor]);

  useEffect(() => {
    if (isInstructor || !activeSession?.id) {
      return;
    }
    const reporter = activityReporterRef.current;
    if (reporter) {
      reporter('ROUTE_CHANGE_WITHIN_APP');
    }
  }, [location.pathname, activeSession?.id, courseName, isInstructor]);

  const handleStart = async () => {
    setActionLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `/api/live/course/${encodeURIComponent(courseName)}/sessions/start`,
        { topic: topic.trim() || undefined },
      );
      setActiveSession(response.data);
      setTopic('');
      await fetchSessions();
    } catch (err) {
      setError(err.response?.data || 'Could not start live session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!activeSession?.id) return;
    setActionLoading(true);
    setError('');
    try {
      await axios.post(
        `/api/live/course/${encodeURIComponent(courseName)}/sessions/${activeSession.id}/end`,
      );
      setActiveSession(null);
      setEmbed(false);
      await fetchSessions();
    } catch (err) {
      setError(err.response?.data || 'Could not end live session.');
    } finally {
      setActionLoading(false);
    }
  };

  const openInNewTab = () => {
    if (!activeSession?.joinUrl) return;
    if (!isInstructor && activityReporterRef.current) {
      activityReporterRef.current('OPENED_EXTERNAL_LIVE_TAB');
    }
    window.open(activeSession.joinUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="lc-page">
      <Link to={`/courses/${encodeURIComponent(courseName)}`} className="lc-back">
        <Icon d={icons.back} size={16} color="currentColor" />
        <span>Back To Course</span>
      </Link>

      <section className="lc-hero">
        <div className="lc-hero-copy">
          <span className="lc-eyebrow">
            <Icon d={icons.globe} size={14} color="currentColor" />
            International Live Classroom
          </span>
          <h1>{courseName} Live Teaching</h1>
          <p>
            Start a real-time teaching session and let learners join instantly from anywhere.
            All times shown in your local timezone: <strong>{timezone}</strong>.
          </p>
        </div>
        <div className={`lc-status ${activeSession ? 'is-live' : 'is-offline'}`}>
          <Icon d={icons.live} size={18} color="currentColor" />
          <span>{activeSession ? 'Live Session Active' : 'No Active Session'}</span>
        </div>
      </section>

      {error && <div className="lc-error">{error}</div>}

      {loading ? (
        <div className="lc-loading">Loading live classroom...</div>
      ) : (
        <>
          <section className="lc-grid">
            <article className="lc-card">
              <h3>Current Session</h3>
              {!activeSession ? (
                <p className="lc-muted">No active classroom right now.</p>
              ) : (
                <div className="lc-session-details">
                  <p><strong>Topic:</strong> {activeSession.topic}</p>
                  <p><strong>Started:</strong> {formatDate(activeSession.startedAt)}</p>
                  <p><strong>Host:</strong> {activeSession.startedByName || 'Teacher'}</p>
                  <div className="lc-actions">
                    <button type="button" className="lc-btn primary" onClick={openInNewTab}>
                      <Icon d={icons.external} size={14} color="currentColor" />
                      Join In New Tab
                    </button>
                    <button
                      type="button"
                      className="lc-btn ghost"
                      onClick={() => setEmbed((current) => !current)}
                    >
                      <Icon d={icons.play} size={14} color="currentColor" />
                      {embed ? 'Hide Embedded View' : 'Open Embedded View'}
                    </button>
                    {isInstructor && (
                      <button
                        type="button"
                        className="lc-btn danger"
                        onClick={handleEnd}
                        disabled={actionLoading}
                      >
                        <Icon d={icons.stop} size={14} color="currentColor" />
                        {actionLoading ? 'Ending...' : 'End Session'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>

            {isInstructor && (
              <article className="lc-card">
                <h3>Teacher Controls</h3>
                <label htmlFor="session-topic">Session Topic</label>
                <input
                  id="session-topic"
                  className="input premium-input"
                  type="text"
                  placeholder="Example: Algebra Revision - Unit 4"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
                <p className="lc-muted">
                  If a session is already active, start will return the current one.
                </p>
                <button
                  type="button"
                  className="lc-btn primary"
                  onClick={handleStart}
                  disabled={actionLoading}
                >
                  <Icon d={icons.live} size={14} color="currentColor" />
                  {actionLoading ? 'Starting...' : 'Start Live Session'}
                </button>
              </article>
            )}
          </section>

          {isInstructor && activeSession && (
            <section className="lc-alerts">
              <header>
                <h3>Live Session Alerts</h3>
                <span>{liveAlerts.length} recent</span>
              </header>

              {liveAlerts.length === 0 ? (
                <p className="lc-muted">No student activity alerts yet for this session.</p>
              ) : (
                <div className="lc-alerts-list">
                  {liveAlerts.map((alertItem, index) => {
                    const message = alertItem?.Message || alertItem?.message || 'Live activity event';
                    const time = alertItem?.time || alertItem?.Time || '';
                    return (
                      <article key={`${time}-${index}`} className="lc-alert-item">
                        <p>{message}</p>
                        <span>{formatDate(time)}</span>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {embed && activeSession?.joinUrl && (
            <section className="lc-embed-wrap">
              <iframe
                title="Live Classroom"
                src={activeSession.joinUrl}
                allow="camera; microphone; fullscreen; display-capture"
                className="lc-embed"
              />
            </section>
          )}

          <section className="lc-history">
            <header>
              <h3>Session History</h3>
              <span>
                <Icon d={icons.clock} size={13} color="currentColor" />
                {history.length} session{history.length === 1 ? '' : 's'}
              </span>
            </header>

            {history.length === 0 ? (
              <p className="lc-muted">No sessions have been created yet.</p>
            ) : (
              <div className="lc-history-list">
                {history.map((session) => (
                  <article key={session.id} className="lc-history-item">
                    <div>
                      <strong>{session.topic}</strong>
                      <p>Started: {formatDate(session.startedAt)}</p>
                      <p>Ended: {session.endedAt ? formatDate(session.endedAt) : 'Still active'}</p>
                    </div>
                    <a href={session.joinUrl} target="_blank" rel="noreferrer" className="lc-link">
                      Open Room
                    </a>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
