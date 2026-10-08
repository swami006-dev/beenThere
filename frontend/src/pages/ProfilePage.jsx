import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';

export function ProfilePage() {
  const { navigate } = useRouter();
  const { currentUser, logout, updateProfile, updateNickname } = useAuth();

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(currentUser?.anonymousIdentity || 'Anonymous Bear');
  const [nicknameError, setNicknameError] = useState('');

  const [isEditingContext, setIsEditingContext] = useState(false);
  const [contextInput, setContextInput] = useState(currentUser?.academicContext || 'Engineering student · 3rd Year');
  const [privacySettings, setPrivacySettings] = useState(currentUser?.privacySettings || {
    hideYear: false,
    blurTimeStamps: false,
    allowDirectNotes: true
  });
  const [savedNotification, setSavedNotification] = useState(false);

  const handleSaveNickname = async (e) => {
    e.preventDefault();
    setNicknameError('');
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed.length < 2) {
      setNicknameError('Nickname must be at least 2 characters long.');
      return;
    }
    try {
      await updateNickname(trimmed);
      setIsEditingNickname(false);
      triggerSaved();
    } catch (err) {
      setNicknameError(err.message || 'Failed to update nickname.');
    }
  };

  const handleSaveContext = (e) => {
    e.preventDefault();
    updateProfile({ academicContext: contextInput });
    setIsEditingContext(false);
    triggerSaved();
  };

  const handleToggleSetting = (key) => {
    const updated = {
      ...privacySettings,
      [key]: !privacySettings[key]
    };
    setPrivacySettings(updated);
    updateProfile({ privacySettings: updated });
    triggerSaved();
  };

  const triggerSaved = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="profile-page-main">
        <div className="container-reading">
          
          <header className="profile-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">Protected Profile</span>
            </div>
            <h1 className="profile-title">Anonymous sanctuary identity.</h1>
            <p className="profile-subtext">
              Your real name, profile photo, and personal accounts are never tied to BeenThere.
            </p>
          </header>

          {savedNotification && (
            <div className="toast-save-banner" role="status">
              <span>✓ Privacy settings updated quietly</span>
            </div>
          )}

          {/* Identity Shield Card */}
          <div className="profile-identity-card">
            <div className="identity-left" style={{ width: '100%' }}>
              <div className="anon-avatar-circle" aria-hidden="true">
                🛡
              </div>
              <div className="identity-details" style={{ width: '100%' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  YOUR ANONYMOUS IDENTITY
                </div>

                {isEditingNickname ? (
                  <form onSubmit={handleSaveNickname} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="field-input"
                        value={nicknameInput}
                        onChange={(e) => { setNicknameInput(e.target.value); setNicknameError(''); }}
                        placeholder="e.g. NightOwl"
                        maxLength={24}
                        style={{ maxWidth: '240px', padding: '6px 10px', fontSize: '0.95rem' }}
                        autoFocus
                      />
                      <button type="submit" className="btn-small-save" style={{ padding: '6px 14px' }}>Save</button>
                      <button type="button" className="btn-small-cancel" onClick={() => { setIsEditingNickname(false); setNicknameError(''); }}>Cancel</button>
                    </div>
                    {nicknameError && (
                      <span style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>{nicknameError}</span>
                    )}
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                      Don't use your real name or contact details.
                    </span>
                  </form>
                ) : (
                  <div className="identity-name-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <h2 className="anon-primary-name" style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--accent-mint)' }}>
                      {currentUser?.anonymousAvatar || '🐻'} {currentUser?.anonymousIdentity || 'Anonymous Bear'}
                    </h2>
                    <button
                      type="button"
                      className="btn-edit-context"
                      onClick={() => { setNicknameInput(currentUser?.anonymousIdentity || ''); setIsEditingNickname(true); }}
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      Change nickname
                    </button>
                    <span className="anon-tag-shield">Identity Shielded</span>
                  </div>
                )}

                {isEditingContext ? (
                  <form onSubmit={handleSaveContext} className="context-edit-form">
                    <input
                      type="text"
                      className="context-edit-input"
                      value={contextInput}
                      onChange={(e) => setContextInput(e.target.value)}
                      placeholder="e.g. 2nd-year Sciences"
                      autoFocus
                    />
                    <div className="context-edit-btns">
                      <button type="submit" className="btn-small-save">Save</button>
                      <button type="button" className="btn-small-cancel" onClick={() => setIsEditingContext(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="identity-context-row">
                    <span className="context-text">{currentUser?.academicContext}</span>
                    <button 
                      type="button" 
                      className="btn-edit-context"
                      onClick={() => setIsEditingContext(true)}
                    >
                      Change description
                    </button>
                  </div>
                )}
                
                <span className="identity-member-since">Active sanctuary member since {currentUser?.joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Minimal Purposeful Contributions */}
          <div className="profile-stats-grid">
            <div className="stat-card">
              <span className="stat-val">3</span>
              <span className="stat-desc">Experiences shared</span>
              <button 
                type="button" 
                className="stat-action-link"
                onClick={() => navigate('/my-posts')}
              >
                View your archive →
              </button>
            </div>

            <div className="stat-card">
              <span className="stat-val">14</span>
              <span className="stat-desc">Students comforted</span>
              <span className="stat-sub-info">Read and found reassurance in your words</span>
            </div>
          </div>

          {/* Topics Shared */}
          <div className="profile-section-block">
            <h3 className="block-title">Themes you've contributed to</h3>
            <div className="topics-cloud">
              {currentUser?.topicsShared.map((topic, i) => (
                <span key={i} className="profile-topic-chip">
                  {topic}
                </span>
              ))}
              <span className="profile-topic-chip">Major changes</span>
            </div>
          </div>

          {/* Privacy & Safety Controls */}
          <div className="profile-section-block">
            <h3 className="block-title">Sanctuary & Safety controls</h3>
            
            <div className="settings-toggles-list">
              <div className="toggle-row">
                <div className="toggle-text">
                  <span className="toggle-label">Hide graduation year in context</span>
                  <span className="toggle-sub">Shows only your field of study (e.g. 'Engineering' instead of '3rd Year').</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${privacySettings.hideYear ? 'checked' : ''}`}
                  onClick={() => handleToggleSetting('hideYear')}
                  role="switch"
                  aria-checked={privacySettings.hideYear}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="toggle-row">
                <div className="toggle-text">
                  <span className="toggle-label">Blur time-stamps</span>
                  <span className="toggle-sub">Displays broad intervals ('several months ago') instead of exact dates to prevent schedule identification.</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${privacySettings.blurTimeStamps ? 'checked' : ''}`}
                  onClick={() => handleToggleSetting('blurTimeStamps')}
                  role="switch"
                  aria-checked={privacySettings.blurTimeStamps}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="toggle-row">
                <div className="toggle-text">
                  <span className="toggle-label">Allow helpful resonance counters</span>
                  <span className="toggle-sub">Permit other students to quietly mark your reflection as 'This helped me'.</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${privacySettings.allowDirectNotes ? 'checked' : ''}`}
                  onClick={() => handleToggleSetting('allowDirectNotes')}
                  role="switch"
                  aria-checked={privacySettings.allowDirectNotes}
                >
                  <span className="toggle-slider" />
                </button>
              </div>
            </div>
          </div>

          {/* Account & Sign out */}
          <div className="profile-footer-actions">
            <button 
              type="button" 
              className="btn-signout-sanctuary"
              onClick={handleSignOut}
            >
              Sign out of space
            </button>
            <span className="signout-hint">Signing out clears local browser session tokens.</span>
          </div>

        </div>
      </main>

      <Footer 
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExploreClick={() => navigate('/explore')}
        onPrivacyClick={() => navigate('/profile')}
        onHowItWorksClick={() => navigate('/')}
      />
    </div>
  );
}
