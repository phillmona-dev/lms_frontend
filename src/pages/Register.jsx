import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// Human-friendly labels for role names
const ROLE_LABELS = {
  STUDENT: 'Student',
  TEACHER: 'Instructor / Teacher',
  PARENT: 'Parent',
  SCHOOL_ADMINISTRATOR: 'School Administrator',
  SYSTEM_ADMINISTRATOR: 'System Administrator',
  BUREAU_OF_EDUCATION: 'Bureau of Education',
  AI_SYSTEM: 'AI System',
  AUTHENTICATION_SYSTEM: 'Authentication System',
};

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: '' });
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get('/api/rbac/roles');
        const roleNames = res.data.map((r) => r.name).sort();
        setRoles(roleNames);
        // Default to STUDENT if available
        if (roleNames.length > 0) {
          setFormData((prev) => ({ ...prev, role: roleNames.includes('STUDENT') ? 'STUDENT' : roleNames[0] }));
        }
      } catch {
        // Fallback to basic roles if endpoint fails
        setRoles(['STUDENT', 'TEACHER']);
        setFormData((prev) => ({ ...prev, role: 'STUDENT' }));
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all fields.');
        return;
    }

    setIsLoading(true);
    const { success, error: msg } = await register(formData.name, formData.email, formData.password, formData.role);
    if (success) {
      navigate('/login');
    } else {
      setError(msg || 'An error occurred during registration');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', minHeight: '100vh', flexDirection: 'row' }}>
      {/* Eye-catching background elements */}
      <div className="login-bg-mesh"></div>
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>

      {/* Left side: System Description */}
      <div style={{ flex: '1 1 50%', minWidth: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem', zIndex: 10 }}>
        <div className="animate-fade-in" style={{ 
          maxWidth: '540px', 
          margin: '0 auto'
        }}>
          <div style={{ 
            padding: '0.4rem 1.25rem', 
            background: 'rgba(0, 0, 0, 0.3)', 
            color: 'white', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: '800', 
            marginBottom: '1.5rem', 
            letterSpacing: '1.5px', 
            textTransform: 'uppercase',
            display: 'inline-block',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)'
          }}>
            Join Our Community
          </div>
          
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: '800', 
            lineHeight: '1.15', 
            marginBottom: '1.25rem',
            color: 'white',
            letterSpacing: '-0.5px',
            textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 5px rgba(0,0,0,0.8)'
          }}>
            Unlock Your <br />
            <span style={{ color: '#93c5fd' }}>
              Potential Today
            </span>
          </h1>
          
          <p style={{ 
            fontSize: '1.2rem', 
            lineHeight: '1.6', 
            color: 'rgba(255, 255, 255, 0.95)', 
            marginBottom: '2.5rem',
            fontWeight: '500',
            textShadow: '0 2px 10px rgba(0,0,0,0.9)'
          }}>
            Create an account to start your learning journey with world-class instructors and interactive content.
          </p>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '30px', fontSize: '0.85rem', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(8px)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              Interactive Courses
            </span>
            <span style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '30px', fontSize: '0.85rem', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(8px)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              Progress Tracking
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Register Panel */}
      <div style={{ flex: '1 1 50%', minWidth: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '2rem' }}>
        <div className="login-content interactive-glass-panel" style={{ 
          padding: '3rem', 
          width: '100%', 
          maxWidth: '460px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: '800', 
              marginBottom: '0.5rem',
              color: '#0f172a'
            }}>
              Create Account
            </h2>
            <p style={{ color: '#475569', fontWeight: '500' }}>Join thousands of learners</p>
          </div>

          {error && (
            <div className="animate-fade-in" style={{ 
              background: 'rgba(239, 68, 68, 0.15)', 
              color: '#fca5a5', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              marginBottom: '1.5rem', 
              textAlign: 'center',
              fontSize: '0.9rem',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>Full Name</label>
              <input 
                type="text" 
                className="input premium-input" 
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{ 
                  padding: '0.875rem 1.25rem', 
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(200, 200, 200, 0.6)',
                  color: '#0f172a',
                  fontWeight: '500'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>Email Address</label>
              <input 
                type="email" 
                className="input premium-input" 
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                style={{ 
                  padding: '0.875rem 1.25rem', 
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(200, 200, 200, 0.6)',
                  color: '#0f172a',
                  fontWeight: '500'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>Password</label>
              <input 
                type="password" 
                className="input premium-input" 
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                style={{ 
                  padding: '0.875rem 1.25rem', 
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(200, 200, 200, 0.6)',
                  color: '#0f172a',
                  fontWeight: '500'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>Role</label>
              <select 
                className="input premium-input" 
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                style={{ 
                  padding: '0.875rem 1.25rem', 
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(200, 200, 200, 0.6)',
                  color: '#0f172a',
                  fontWeight: '500'
                }}
              >
                {rolesLoading ? (
                  <option value="">Loading roles...</option>
                ) : (
                  roles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role] || role.replace(/_/g, ' ')}
                    </option>
                  ))
                )}
              </select>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading}
              style={{ 
                marginTop: '1rem', 
                padding: '0.875rem', 
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                background: '#3b82f6',
                border: 'none',
                color: 'white'
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div style={{ 
            marginTop: '2rem', 
            textAlign: 'center', 
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            paddingTop: '1.5rem'
          }}>
            <p style={{ fontSize: '0.95rem', color: '#475569', fontWeight: '500' }}>
              Already have an account? <Link to="/login" style={{ fontWeight: '700', marginLeft: '0.25rem', color: '#2563eb' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
