import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
        setError('Please enter both email and password.');
        return;
    }

    setIsLoading(true);
    const { success, error: msg } = await login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError(msg || 'An error occurred during login');
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
            display: 'inline-block', 
            padding: '0.4rem 1.25rem', 
            background: 'rgba(0, 0, 0, 0.3)', 
            color: 'white', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: '800', 
            marginBottom: '1.5rem', 
            letterSpacing: '1.5px', 
            textTransform: 'uppercase',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)'
          }}>
            {t('auth.elevate')}
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
            {t('auth.welcome_title')} <br />
            <span style={{ color: '#93c5fd' }}>
              {t('auth.platform_name')}
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
            {t('auth.platform_desc')}
          </p>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '30px', fontSize: '0.85rem', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(8px)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '1.1rem' }}></span> {t('auth.interactive')}
            </span>
            <span style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '30px', fontSize: '0.85rem', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(8px)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '1.1rem' }}></span> {t('auth.tracking')}
            </span>
            <span style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '30px', fontSize: '0.85rem', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(8px)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '1.1rem' }}></span> {t('auth.community')}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Login Panel */}
      <div style={{ flex: '1 1 50%', minWidth: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '2rem' }}>
        <div className="login-content interactive-glass-panel" style={{ 
          padding: '3rem', 
          width: '100%', 
          maxWidth: '440px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: '800', 
              marginBottom: '0.5rem',
              color: '#0f172a'
            }}>
              {t('auth.sign_in')}
            </h2>
            <p style={{ color: '#475569', fontWeight: '500' }}>Log in to access your dashboard</p>
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>{t('auth.email')}</label>
              <input 
                type="email" 
                className="input premium-input" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>{t('auth.password')}</label>
              <input 
                type="password" 
                className="input premium-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {isLoading ? t('auth.signing_in') : t('auth.sign_in')}
            </button>
          </form>
          
          <div style={{ 
            marginTop: '2rem', 
            textAlign: 'center', 
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            paddingTop: '1.5rem'
          }}>
            <p style={{ fontSize: '0.95rem', color: '#475569', fontWeight: '500' }}>
              {t('auth.no_account')} <Link to="/register" style={{ fontWeight: '700', marginLeft: '0.25rem', color: '#2563eb' }}>{t('auth.create_one')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
