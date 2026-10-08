import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';

const GENERATED_NAMES = [
  'Anonymous Bear',
  'Anonymous Fox',
  'Anonymous Moon',
  'Anonymous Owl',
  'Anonymous Star',
  'Anonymous Leaf',
  'Anonymous Panda',
  'Anonymous Wolf'
];

export function RegisterPage() {
  const { navigate } = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [identityMode, setIdentityMode] = useState('generated'); // 'generated' | 'custom'
  const [generatedIndex, setGeneratedIndex] = useState(0);
  const [customNickname, setCustomNickname] = useState('');
  const [academicContext, setAcademicContext] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password requirements validations
  const reqLength = password.length >= 8;
  const reqLower = /[a-z]/.test(password);
  const reqUpper = /[A-Z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim()) {
      setErrorMessage('Please provide a confidential email address.');
      return;
    }
    if (!reqLength || !reqLower || !reqUpper || !reqNumber || !reqSpecial) {
      setErrorMessage('Please ensure your password meets all requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const chosenIdentity = identityMode === 'custom' ? customNickname.trim() : GENERATED_NAMES[generatedIndex];
    if (identityMode === 'custom' && (!chosenIdentity || chosenIdentity.length < 2)) {
      setErrorMessage('Nickname must be at least 2 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(email, password, chosenIdentity, academicContext || 'College student');
      setIsLoading(false);
      if (res?.token) {
        navigate('/home');
      } else {
        setInfoMessage(res?.message || 'Registration successful! Please check your email to confirm your account before logging in.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Registration failed. Please check your details and try again.');
    }
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="auth-page-main">
        <div className="container-reading auth-container">
          
            <div className="auth-header" style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1 className="auth-title" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Create your anonymous space.
              </h1>
              <p className="auth-subtext" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Your email secures your account. Other students never see it.
              </p>
            </div>

            <div className="auth-surface" style={{
              backgroundColor: 'var(--surface-primary, #111318)',
              border: '1px solid var(--border, #292D35)',
              borderRadius: '10px',
              padding: '32px 28px',
              maxWidth: '480px',
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

              {infoMessage && (
                <div className="auth-notice-banner" style={{
                  backgroundColor: 'rgba(123, 224, 179, 0.1)',
                  border: '1px solid rgba(123, 224, 179, 0.3)',
                  color: 'var(--accent-mint)',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  fontSize: '0.86rem',
                  marginBottom: '20px'
                }} role="status">
                  <span>{infoMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form" noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Email Field */}
                <div className="form-group">
                  <label htmlFor="reg-email" className="field-label" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    id="reg-email"
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
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px', margin: '4px 0 0 0' }}>
                    Used only to secure your account. Other students never see it.
                  </p>
                </div>

                {/* Password & Confirm Password */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="reg-password" className="field-label" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Password
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        className="field-input"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                        autoComplete="new-password"
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

                  <div className="form-group">
                    <label htmlFor="reg-confirm" className="field-label" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Confirm password
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        id="reg-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="field-input"
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(''); }}
                        autoComplete="new-password"
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? '👁️' : '🙈'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirement Checklist */}
                <div className="password-checklist-box" style={{
                  backgroundColor: 'var(--surface-subtle, #14171D)',
                  border: '1px solid var(--border, #292D35)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '6px 12px'
                }}>
                  <div style={{ color: reqLength ? 'var(--accent-mint)' : 'var(--text-tertiary)' }}>
                    {reqLength ? '✓' : '○'} At least 8 characters
                  </div>
                  <div style={{ color: reqLower ? 'var(--accent-mint)' : 'var(--text-tertiary)' }}>
                    {reqLower ? '✓' : '○'} Lowercase letter
                  </div>
                  <div style={{ color: reqUpper ? 'var(--accent-mint)' : 'var(--text-tertiary)' }}>
                    {reqUpper ? '✓' : '○'} Uppercase letter
                  </div>
                  <div style={{ color: reqNumber ? 'var(--accent-mint)' : 'var(--text-tertiary)' }}>
                    {reqNumber ? '✓' : '○'} Number
                  </div>
                  <div style={{ color: reqSpecial ? 'var(--accent-mint)' : 'var(--text-tertiary)' }}>
                    {reqSpecial ? '✓' : '○'} Special character
                  </div>
                </div>

                {/* Anonymous Identity Selector */}
                <div className="form-group persona-selector-group" style={{ marginTop: '8px' }}>
                  <label className="field-label" style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'block' }}>
                    Choose your anonymous name
                  </label>
                  <p className="field-subtext" style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                    Choose a name you'd like other students to see. Your real identity is never shown to other students.
                  </p>

                  {identityMode === 'generated' ? (
                    <div className="generated-identity-box" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--surface-subtle, #14171D)',
                      border: '1px solid var(--border, #292D35)',
                      borderRadius: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{
                          padding: '10px 16px',
                          background: 'var(--surface, #181B22)',
                          border: '1px solid var(--border-hover, #3A3F4B)',
                          borderRadius: '6px',
                          fontWeight: 600,
                          color: 'var(--accent-mint)',
                          fontSize: '0.95rem',
                          letterSpacing: '0.01em'
                        }}>
                          🎲 {GENERATED_NAMES[generatedIndex]}
                        </div>

                        <button
                          type="button"
                          className="btn-auth-secondary"
                          onClick={() => setGeneratedIndex((prev) => (prev + 1) % GENERATED_NAMES.length)}
                          style={{
                            padding: '9px 14px',
                            fontSize: '0.84rem',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Generate another
                        </button>
                      </div>

                      <div style={{ paddingTop: '2px' }}>
                        <button
                          type="button"
                          onClick={() => setIdentityMode('custom')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            textDecoration: 'underline',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          Choose my own nickname
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="custom-identity-box" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      padding: '16px',
                      background: 'var(--surface-subtle, #14171D)',
                      border: '1px solid var(--border, #292D35)',
                      borderRadius: '6px'
                    }}>
                      <label htmlFor="reg-nickname" style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Enter a nickname
                      </label>
                      <input
                        id="reg-nickname"
                        type="text"
                        className="field-input"
                        placeholder="NightOwl"
                        value={customNickname}
                        onChange={(e) => { setCustomNickname(e.target.value); setErrorMessage(''); }}
                        maxLength={24}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--surface, #181B22)',
                          border: '1px solid var(--border, #292D35)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        required
                      />

                      <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
                        Don't use your real name, phone number, email, or identifying details.
                      </p>

                      <div style={{ paddingTop: '2px' }}>
                        <button
                          type="button"
                          onClick={() => setIdentityMode('generated')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            textDecoration: 'underline',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          ← Use generated anonymous name
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Study context / Major Field (OPTIONAL) */}
                <div className="form-group optional-context-box" style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="reg-context" className="field-label" style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      Study context / Major
                    </label>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}>
                      OPTIONAL
                    </span>
                  </div>
                  <input
                    id="reg-context"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Engineering student, Biology major"
                    value={academicContext}
                    onChange={(e) => setAcademicContext(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--surface-subtle, #14171D)',
                      border: '1px solid var(--border, #292D35)',
                      borderRadius: '6px',
                      padding: '12px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Submit Actions */}
                <div className="auth-actions" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        <span>Creating your anonymous space...</span>
                      </>
                    ) : (
                      <span>Create my anonymous space →</span>
                    )}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Already have a space? </span>
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
                      onClick={() => navigate('/login')}
                    >
                      Sign in →
                    </button>
                  </div>
                </div>
              </form>

              <div className="auth-privacy-reassurance" style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span aria-hidden="true">🛡</span>
                <span>Your email secures your account. Other students never see it.</span>
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

