import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';

export function LoginPage() {
  const { navigate } = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Incorrect email or password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      setIsLoading(false);
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/home';
      navigate(redirectUrl);
    } catch (err) {
      setIsLoading(false);
      // Friendly error message, never expose account existence or raw errors
      if (err.message && (err.message.includes('network') || err.message.includes('fetch'))) {
        setErrorMessage('Something went wrong. Please try again.');
      } else {
        setErrorMessage('Incorrect email or password.');
      }
    }
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="auth-page-main">
        <div className="container-reading auth-container">
          
          <div className="auth-header" style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 className="auth-title" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Welcome back.
            </h1>
            <p className="auth-subtext" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Continue to your anonymous space.
            </p>
          </div>

          <div className="auth-surface" style={{
            backgroundColor: 'var(--surface-primary, #111318)',
            border: '1px solid var(--border, #292D35)',
            borderRadius: '10px',
            padding: '32px 28px',
            maxWidth: '440px',
            margin: '0 auto'
          }}>
            {errorMessage && (
              <div className="auth-error-banner" role="alert" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.86rem',
                marginBottom: '20px'
              }}>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label htmlFor="login-email" className="field-label" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="field-input"
                  placeholder="student@campus.edu"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                  autoComplete="email"
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--surface-subtle, #14171D)',
                    border: '1px solid var(--border, #292D35)',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="login-password" className="field-label" style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <button 
                    type="button" 
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.8rem', cursor: 'pointer' }}
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot?
                  </button>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="field-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--surface-subtle, #14171D)',
                      border: '1px solid var(--border, #292D35)',
                      borderRadius: '6px',
                      padding: '12px 44px 12px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <button 
                  type="submit" 
                  className="btn-auth-primary"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isLoading ? (
                    <>
                      <span className="calm-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#090A0C' }} />
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <span>Sign in →</span>
                  )}
                </button>
              </div>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
              <span>Your email is only used to secure your account.</span>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Don't have an anonymous space yet? </span>
              <button 
                type="button" 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-mint)',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  padding: 0
                }}
                onClick={() => navigate('/register')}
              >
                Create one →
              </button>
            </div>
          </div>

        </div>
      </main>

      <Footer 
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExploreClick={() => navigate('/explore')}
        onPrivacyClick={() => navigate('/')}
        onHowItWorksClick={() => navigate('/')}
      />
    </div>
  );
}
