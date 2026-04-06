import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
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
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  check: 'M20 6L9 17l-5-5',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  video: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
};

const fileIcon = (name = '') => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) {
    return icons.video;
  }
  if (ext === 'pdf') {
    return icons.file;
  }
  return icons.file;
};

const fileColor = (name = '') => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) {
    return '#ef4444';
  }
  if (ext === 'pdf') {
    return '#f59e0b';
  }
  return '#0ea5a8';
};

const resourceIdOf = (resource, index) =>
  resource?.resource_id ?? resource?.resourceId ?? resource?.id ?? index;

const resourceNameOf = (resource, index) =>
  resource?.file_name ?? resource?.fileName ?? resource?.name ?? `Resource ${index + 1}`;

const studentIdOf = (student, index) => student?.id ?? student?.studentId ?? index;

const Tab = ({ label, count, active, onClick }) => (
  <button type="button" className={`ld-tab ${active ? 'active' : ''}`} onClick={onClick}>
    <span>{label}</span>
    {count !== undefined && <span className="ld-tab-count">({count})</span>}
  </button>
);

export default function LessonDetails() {
  const { courseId, lessonId } = useParams();
  const { user } = useAuth();
  const courseName = decodeURIComponent(courseId);

  const [lesson, setLesson] = useState(null);
  const [resources, setResources] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('video');

  const [otpInput, setOtpInput] = useState('');
  const [attendLoading, setAttendLoading] = useState(false);
  const [attendMsg, setAttendMsg] = useState('');
  const [attended, setAttended] = useState(false);

  const [duration, setDuration] = useState(10);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(null);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Video states
  const [videoFile, setVideoFile] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadMsg, setVideoUploadMsg] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [videoDeleting, setVideoDeleting] = useState(false);

  const role = user?.legacyRole || user?.roles?.[0]?.name || '';
  const roleNormalized = String(role).toUpperCase();
  const isInstructor = roleNormalized.includes('INSTRUCTOR') || roleNormalized.includes('TEACHER');
  const isStudent = roleNormalized.includes('STUDENT');

  const lessonTitle = lesson?.title || lesson?.lessonTitle || `Lesson ${lessonId}`;

  const tabs = useMemo(
    () => [
      { key: 'video', label: '▶ Video' },
      { key: 'resources', label: 'Resources', count: resources.length },
      {
        key: 'attendance',
        label: isInstructor ? 'Attendance List' : 'Mark Attendance',
        count: isInstructor ? attendanceList.length : undefined,
      },
      ...(isInstructor ? [{ key: 'otp', label: 'Generate OTP' }] : []),
    ],
    [attendanceList.length, isInstructor, resources.length],
  );

  useEffect(() => {
    if (!tabs.some((tabItem) => tabItem.key === tab)) {
      setTab('resources');
    }
  }, [tab, tabs]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [lessonRes, resRes, attendRes] = await Promise.allSettled([
          axios.get(`/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}`),
          axios.get(`/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/resources`),
          isInstructor
            ? axios.get(
                `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/attendanceList`,
              )
            : Promise.resolve({ data: [] }),
        ]);

        if (lessonRes.status === 'fulfilled') {
          setLesson(lessonRes.value.data);
          setHasVideo(!!lessonRes.value.data?.hasVideo);
        } else {
          setLesson(null);
        }

        if (resRes.status === 'fulfilled' && Array.isArray(resRes.value.data)) {
          setResources(resRes.value.data);
        } else {
          setResources([]);
        }

        if (attendRes.status === 'fulfilled' && Array.isArray(attendRes.value.data)) {
          setAttendanceList(attendRes.value.data);
        } else {
          setAttendanceList([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [courseName, isInstructor, lessonId]);

  const handleAttend = async (event) => {
    event.preventDefault();
    setAttendLoading(true);
    setAttendMsg('');
    try {
      await axios.post(
        `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/attendLesson?otp=${otpInput}`,
      );
      setAttended(true);
      setAttendMsg('success');
    } catch (error) {
      setAttendMsg(error.response?.data || 'Invalid OTP or already attended.');
    } finally {
      setAttendLoading(false);
    }
  };

  const handleGenerateOtp = async () => {
    setGenLoading(true);
    setGeneratedOtp(null);
    try {
      const response = await axios.post(
        `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/generate-OTP?duration=${duration}`,
      );
      setGeneratedOtp(response.data);
    } catch (error) {
      alert(error.response?.data || 'Failed to generate OTP');
    } finally {
      setGenLoading(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) {
      return;
    }

    setUploadLoading(true);
    setUploadMsg('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      await axios.post(
        `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/add-resource`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      setUploadMsg('success');
      setUploadFile(null);

      const resourceResponse = await axios.get(
        `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/resources`,
      );
      if (Array.isArray(resourceResponse.data)) {
        setResources(resourceResponse.data);
      }
    } catch (error) {
      setUploadMsg(error.response?.data || 'Upload failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadResource = (resourceId, fileName) => {
    const url = `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/resources/${resourceId}`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  };

  const handleVideoUpload = async (event) => {
    event.preventDefault();
    if (!videoFile) return;

    setVideoUploading(true);
    setVideoUploadMsg('');
    try {
      const formData = new FormData();
      formData.append('video', videoFile);

      await axios.post(
        `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/upload-video`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      setVideoUploadMsg('success');
      setVideoFile(null);
      setHasVideo(true);
    } catch (error) {
      setVideoUploadMsg(error.response?.data || 'Video upload failed.');
    } finally {
      setVideoUploading(false);
    }
  };

  const handleVideoDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    setVideoDeleting(true);
    try {
      await axios.delete(
        `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/delete-video`,
      );
      setHasVideo(false);
      setVideoUploadMsg('');
    } catch (error) {
      alert(error.response?.data || 'Failed to delete video.');
    } finally {
      setVideoDeleting(false);
    }
  };

  const token = localStorage.getItem('token');
  const videoStreamUrl = `/api/course/course/${encodeURIComponent(courseName)}/lessons/${lessonId}/stream-video${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  return (
    <div className="ld-page ctx-page-with-chat">
      <div className="ld-breadcrumb">
        <Link to="/courses" className="ld-crumb-link">
          Courses
        </Link>
        <span className="ld-crumb-sep">/</span>
        <Link to={`/courses/${encodeURIComponent(courseName)}`} className="ld-crumb-link">
          {courseName}
        </Link>
        <span className="ld-crumb-sep">/</span>
        <span className="ld-crumb-current">{lessonTitle}</span>
      </div>

      <section className="ld-hero">
        <div className="ld-hero-orb ld-hero-orb-main" />
        <div className="ld-hero-orb ld-hero-orb-soft" />

        <div className="ld-hero-main">
          <span className="ld-hero-icon">
            <Icon d={icons.eye} size={24} color="currentColor" />
          </span>

          <div className="ld-hero-copy">
            <h1>{loading ? 'Loading...' : lessonTitle}</h1>
            <p>{lesson?.description || courseName}</p>

            <div className="ld-hero-chips">
              <span className="ld-chip">{resources.length} Resources</span>
              {isInstructor && <span className="ld-chip">{attendanceList.length} Attended</span>}
              {attended && (
                <span className="ld-chip is-success">
                  <Icon d={icons.check} size={13} color="currentColor" />
                  Attendance Marked
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="ld-tabs-wrap">
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

      {/* ==================== VIDEO TAB ==================== */}
      {tab === 'video' && (
        <section className="ld-video-wrap">
          {/* Video Player */}
          {hasVideo ? (
            <article className="ld-video-player-card">
              <div className="ld-video-container">
                <video
                  key={videoStreamUrl}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  className="ld-video-element"
                >
                  <source src={videoStreamUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="ld-video-info">
                <div className="ld-video-title">
                  <Icon d={icons.video} size={20} color="currentColor" />
                  <h3>{lessonTitle} — Video Lecture</h3>
                </div>
                {isInstructor && (
                  <button
                    type="button"
                    className="btn ld-video-delete-btn"
                    onClick={handleVideoDelete}
                    disabled={videoDeleting}
                  >
                    {videoDeleting ? 'Deleting...' : '🗑 Delete Video'}
                  </button>
                )}
              </div>
            </article>
          ) : (
            <article className="ld-video-empty-card">
              <div className="ld-video-empty-icon">
                <Icon d={icons.video} size={48} color="currentColor" />
              </div>
              <h3>No Video Uploaded</h3>
              <p>
                {isInstructor
                  ? 'Upload a video lecture for your students to watch.'
                  : 'The instructor has not uploaded a video for this lesson yet.'}
              </p>
            </article>
          )}

          {/* Video Upload (Instructor Only) */}
          {isInstructor && (
            <article className="ld-video-upload-card">
              <h3>{hasVideo ? 'Replace Video' : 'Upload Video'}</h3>
              <p className="ld-video-upload-hint">
                Supported: MP4, WebM, OGG, MOV, AVI, MKV (max 500MB)
              </p>
              <form onSubmit={handleVideoUpload} className="ld-upload-form">
                <label className="ld-file-pick ld-video-file-pick">
                  <Icon d={icons.upload} size={18} color="currentColor" />
                  <span>{videoFile ? videoFile.name : 'Choose a video file...'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(event) => {
                      setVideoFile(event.target.files?.[0] || null);
                      setVideoUploadMsg('');
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={!videoFile || videoUploading}
                  className="btn btn-primary ld-upload-btn"
                >
                  {videoUploading ? 'Uploading...' : hasVideo ? 'Replace Video' : 'Upload Video'}
                </button>
              </form>

              {videoUploadMsg && videoUploadMsg !== 'success' && (
                <p className="ld-upload-msg error">{videoUploadMsg}</p>
              )}
              {videoUploadMsg === 'success' && (
                <p className="ld-upload-msg success">
                  <Icon d={icons.check} size={14} color="currentColor" />
                  Video uploaded successfully
                </p>
              )}
            </article>
          )}
        </section>
      )}

      {tab === 'resources' && (
        <section className="ld-resources-wrap">
          {isInstructor && (
            <article className="ld-upload-card">
              <h3>Upload Resource</h3>
              <form onSubmit={handleUpload} className="ld-upload-form">
                <label className="ld-file-pick">
                  <Icon d={icons.upload} size={18} color="currentColor" />
                  <span>{uploadFile ? uploadFile.name : 'Choose a file...'}</span>
                  <input
                    type="file"
                    onChange={(event) => {
                      setUploadFile(event.target.files?.[0] || null);
                      setUploadMsg('');
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={!uploadFile || uploadLoading}
                  className="btn btn-primary ld-upload-btn"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </form>

              {uploadMsg && uploadMsg !== 'success' && <p className="ld-upload-msg error">{uploadMsg}</p>}
              {uploadMsg === 'success' && (
                <p className="ld-upload-msg success">
                  <Icon d={icons.check} size={14} color="currentColor" />
                  Uploaded successfully
                </p>
              )}
            </article>
          )}

          {loading ? (
            <div className="ld-loading">Loading resources...</div>
          ) : resources.length === 0 ? (
            <EmptyState icon={icons.file} message="No resources uploaded yet." />
          ) : (
            <div className="ld-resource-list">
              {resources.map((resource, index) => {
                const resourceName = resourceNameOf(resource, index);
                const resourceId = resourceIdOf(resource, index);
                const extension = resourceName.split('.').pop() || 'file';
                const color = fileColor(resourceName);
                const canDownload = resource.downloadable !== false;

                return (
                  <article key={resourceId} className={`ld-resource-item ${!canDownload ? 'ld-resource-locked' : ''}`}>
                    <span
                      className="ld-resource-icon"
                      style={{ '--ld-file-color': canDownload ? color : '#94a3b8' }}
                    >
                      <Icon d={canDownload ? fileIcon(resourceName) : icons.lock} size={21} color="currentColor" />
                    </span>

                    <div className="ld-resource-main">
                      <p>{resourceName}</p>
                      <span>{extension.toUpperCase()}{resource.file_type ? ` • ${resource.file_type}` : ''}</span>
                    </div>

                    {canDownload ? (
                      <button
                        type="button"
                        onClick={() => downloadResource(resourceId, resourceName)}
                        className="ld-resource-download"
                        style={{ '--ld-file-color': color }}
                      >
                        <Icon d={icons.download} size={15} color="currentColor" />
                        Download
                      </button>
                    ) : (
                      <span className="ld-resource-locked-badge">
                        <Icon d={icons.lock} size={13} color="currentColor" />
                        Mark attendance to unlock
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'attendance' && isStudent && (
        <section className="ld-student-attendance-wrap">
          <article className="ld-student-attendance-card">
            <h3>Mark Your Attendance</h3>
            <p>Enter the OTP provided by your instructor to mark attendance for this lesson.</p>

            {attended || attendMsg === 'success' ? (
              <div className="ld-attendance-success">
                <span>
                  <Icon d={icons.check} size={30} color="currentColor" />
                </span>
                <strong>Attendance Confirmed</strong>
                <p>Your attendance has been recorded.</p>
              </div>
            ) : (
              <form onSubmit={handleAttend} className="ld-attendance-form">
                <label htmlFor="otp-input">OTP Code</label>
                <input
                  id="otp-input"
                  className="input ld-otp-input"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={(event) => {
                    setOtpInput(event.target.value);
                    setAttendMsg('');
                  }}
                  maxLength={8}
                />

                {attendMsg && <p className="ld-attendance-error">{attendMsg}</p>}

                <button
                  type="submit"
                  className="btn btn-primary ld-full-btn"
                  disabled={!otpInput || attendLoading}
                >
                  {attendLoading ? 'Verifying...' : 'Confirm Attendance'}
                </button>
              </form>
            )}
          </article>
        </section>
      )}

      {tab === 'attendance' && isInstructor && (
        <section className="ld-attendance-list-wrap">
          <article className="ld-attendance-panel">
            <header>
              <h3>Students Attended ({attendanceList.length})</h3>
            </header>

            {attendanceList.length === 0 ? (
              <EmptyState icon={icons.users} message="No students have attended yet." />
            ) : (
              attendanceList.map((student, index) => (
                <div className="ld-attendance-row" key={studentIdOf(student, index)}>
                  <span className="ld-attendance-avatar">
                    {(student.name || student.studentName || 'S')[0]?.toUpperCase()}
                  </span>

                  <div className="ld-attendance-main">
                    <p>{student.name || student.studentName || 'Student'}</p>
                    <span>{student.email || ''}</span>
                  </div>

                  <span className="ld-present-pill">
                    <Icon d={icons.check} size={12} color="currentColor" />
                    Present
                  </span>
                </div>
              ))
            )}
          </article>
        </section>
      )}

      {tab === 'otp' && isInstructor && (
        <section className="ld-otp-wrap">
          <article className="ld-otp-card">
            <div className="ld-otp-head">
              <span className="ld-otp-icon">
                <Icon d={icons.key} size={24} color="currentColor" />
              </span>

              <div>
                <h3>Generate Attendance OTP</h3>
                <p>Share this OTP with students to mark their attendance.</p>
              </div>
            </div>

            <div className="ld-duration-block">
              <label>OTP Validity (minutes)</label>
              <div className="ld-duration-list">
                {[5, 10, 15, 30].map((itemDuration) => (
                  <button
                    key={itemDuration}
                    type="button"
                    className={`ld-duration-btn ${duration === itemDuration ? 'active' : ''}`}
                    onClick={() => setDuration(itemDuration)}
                  >
                    {itemDuration} min
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateOtp}
              disabled={genLoading}
              className="btn btn-primary ld-full-btn"
            >
              {genLoading ? 'Generating...' : 'Generate OTP'}
            </button>

            {generatedOtp !== null && (
              <div className="ld-otp-result">
                <p>OTP Generated Successfully</p>
                <div>{generatedOtp}</div>
                <span>
                  <Icon d={icons.clock} size={14} color="currentColor" />
                  Valid for {duration} minutes
                </span>
              </div>
            )}
          </article>
        </section>
      )}

      <ContextChatWidget
        contextType="LESSON"
        contextKey={`${courseName}::${lessonId}`}
        title="Lesson Chat"
        subtitle="Ask questions about this lesson and help each other in real time."
      />
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="ld-empty">
      <Icon d={icon} size={44} color="currentColor" />
      <p>{message}</p>
    </div>
  );
}
