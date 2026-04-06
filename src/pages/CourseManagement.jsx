import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  plus: "M12 5v14M5 12h14",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  arrow: "M5 12h14M12 5l7 7-7 7",
  back: "M19 12H5M12 19l-7-7 7-7",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
};

export default function CourseManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    duration: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/course/get-my-courses');
      if (Array.isArray(res.data)) {
        setCourses(res.data);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
    setLoading(false);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      // Backend expects duration as Float
      const payload = {
        ...newCourse,
        duration: parseFloat(newCourse.duration) || 0
      };
      
      const res = await axios.post('/api/course/create-course', payload);
      setCourses([res.data, ...courses]);
      setShowCreateModal(false);
      setNewCourse({ name: '', description: '', duration: '' });
      // navigate(`/courses/${encodeURIComponent(res.data.name)}`);
    } catch (err) {
      setError(err.response?.data || "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Course Management</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b' }}>Manage your created courses and curriculum</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px', padding: '0.75rem 1.5rem' }}
        >
          <Icon d={icons.plus} size={20} color="white" />
          Create New Course
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="animate-spin" style={{ fontSize: '2rem' }}>⌛</div>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading your courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem', 
          background: 'white', 
          borderRadius: '24px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: '#f1f5f9', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem'
          }}>
            <Icon d={icons.book} size={40} color="#94a3b8" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Courses Yet</h3>
          <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
            You haven't created any courses yet. Start your journey as an instructor by sharing your knowledge.
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ borderRadius: '12px' }}
          >
            Create Your First Course
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {courses.map(course => (
            <div key={course.id || course.courseName} style={{
              background: 'white', 
              borderRadius: '20px', 
              padding: '1.5rem', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1.2rem'
                }}>
                  {course.courseName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <Link to={`/courses/${encodeURIComponent(course.courseName)}`} style={{ color: '#64748b' }}>
                  <Icon d={icons.settings} size={20} />
                </Link>
              </div>
              
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>{course.courseName}</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1, lineHeight: '1.5' }}>
                {(course.courseDescription ?? '').length > 120 ? course.courseDescription.substring(0, 120) + '...' : (course.courseDescription ?? 'No description')}
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.8rem' }}>
                  <Icon d={icons.clock} size={14} />
                  {course.courseDuration} hrs
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.8rem' }}>
                  <Icon d={icons.user} size={14} />
                  Enrolled Students
                </div>
              </div>
              
              <Link 
                to={`/courses/${encodeURIComponent(course.courseName)}`}
                className="btn btn-secondary" 
                style={{ textAlign: 'center', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                Manage Course Content
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(15, 23, 42, 0.6)', 
          backdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="animate-fade-in" style={{ 
            background: 'white', 
            borderRadius: '24px', 
            width: '100%', 
            maxWidth: '500px', 
            padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create New Course</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}
              >
                ×
              </button>
            </div>
            
            {error && (
              <div style={{ 
                background: '#fef2f2', 
                color: '#dc2626', 
                padding: '0.75rem', 
                borderRadius: '10px', 
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                border: '1px solid #fee2e2'
              }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Course Name</label>
                <input 
                  type="text" 
                  className="input premium-input"
                  required
                  placeholder="e.g. Advanced Java Programming"
                  value={newCourse.name}
                  onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  style={{ padding: '0.75rem 1rem', borderRadius: '10px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Description</label>
                <textarea 
                  className="input premium-input"
                  required
                  rows="4"
                  placeholder="What will students learn in this course?"
                  value={newCourse.description}
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                  style={{ padding: '0.75rem 1rem', borderRadius: '10px', resize: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Duration (Hours)</label>
                <input 
                  type="number" 
                  step="0.5"
                  className="input premium-input"
                  required
                  placeholder="e.g. 20.5"
                  value={newCourse.duration}
                  onChange={e => setNewCourse({...newCourse, duration: e.target.value})}
                  style={{ padding: '0.75rem 1rem', borderRadius: '10px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, borderRadius: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 2, borderRadius: '12px', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
