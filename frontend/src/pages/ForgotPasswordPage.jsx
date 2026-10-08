import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';

export function ForgotPasswordPage() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your confidential recovery address.');
      return;
    }

    setIsSubmitted(true);
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="auth-page-main">
        <div className="container-reading auth-container">
          
          <div className="auth-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">Recovery</span>
            </div>
            <h1 className="auth-title">Recover your private space.</h1>
            <p className="auth-subtext">
              Enter the email address you used when creating your account. We will send a secure link to restore access.
            </p>
          </div>

          <div className="auth-surface">
            {isSubmitted ? (
              <div className="auth-recovery-success">
                <div className="recovery-check-icon">✓</div>
                <h3 className="recovery-success-title">Recovery link dispatched</h3>
                <p className="recovery-success-sub">
                  If an account exists for <strong>{email}</strong>, you will receive a silent recovery token within 2 minutes. Your real identity remains shielded.
                </p>
                <button 
                  type="button" 
                  className="btn-auth-primary"
                  onClick={() => navigate('/login')}
                  style={{ marginTop: '20px' }}
                >
                  Return to sign in →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                {errorMessage && (
                  <div className="auth-error-banner" role="alert">
                    <span className="error-dot" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="recovery-email" className="field-label">
                    Confidential email address
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    className="field-input"
                    placeholder="student@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <span className="field-hint">Used strictly for authentication. Never displayed on your reflections.</span>
                </div>

                <div className="auth-actions">
                  <button type="submit" className="btn-auth-primary">
                    Send recovery link →
                  </button>

                  <button 
                    type="button" 
                    className="btn-auth-secondary"
                    onClick={() => navigate('/login')}
                  >
                    Remember your password? Sign in
                  </button>
                </div>
              </form>
            )}

            <div className="auth-privacy-reassurance">
              <span className="reassurance-icon" aria-hidden="true">🔒</span>
              <p className="reassurance-text">
                Your real identity isn't shown to other students.
              </p>
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
