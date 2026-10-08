import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { CalmLoader } from '../components/CalmLoader';
import { RequestConversationModal } from '../components/RequestConversationModal';
import { api } from '../config/api';

export function AnonymousProfilePage() {
  const { match, navigate, routeState } = useRouter();
  const { isAuthenticated, currentUser } = useAuth();
  const profileId = match?.params?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    if (!profileId) {
      setLoading(false);
      setError('Profile ID not found.');
      return;
    }

    api.get(`/auth/profile/anonymous/${profileId}`)
      .then(res => {
        if (!isMounted) return;
        setProfile(res);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn('Anonymous profile fetch error:', err.message);
        setError('This anonymous student profile could not be loaded.');
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [profileId]);

  const handleBack = () => {
    if (routeState?.from) {
      navigate(routeState.from);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/community');
    }
  };

  const isOwnProfile = currentUser && (
    (currentUser.anonymousProfileId && currentUser.anonymousProfileId === profileId) ||
    (profile && profile.anonymousDisplayName === currentUser.anonymousIdentity)
  );

  const avatar = profile?.avatarKey === 'moon' ? '🌙' 
    : profile?.avatarKey === 'star' ? '⭐' 
    : profile?.avatarKey === 'panda' ? '🐼' 
    : profile?.avatarKey === 'fox' ? '🦊' 
    : profile?.avatarKey === 'leaf' ? '🍃' 
    : profile?.avatarKey === 'bear' ? '🐻' 
    : profile?.avatarKey === 'wolf' ? '🐺' 
    : '🦉';

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="profile-page-main" style={{ minHeight: 'calc(100vh - 240px)', padding: '40px 0 60px' }}>
        <div className="container-reading">

          {/* Navigation link */}
          <div style={{ marginBottom: '24px' }}>
            <button 
              type="button" 
              className="back-nav-btn"
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0
              }}
            >
              ← Back
            </button>
          </div>

          {loading ? (
            <CalmLoader label="Opening anonymous profile..." minHeight="300px" />
          ) : error || !profile ? (
            <div className="state-screen text-center" style={{ minHeight: '260px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>🛡️</div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Profile Not Found
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                {error || 'This anonymous student profile is not currently available.'}
              </p>
              <button type="button" className="btn-auth-primary" style={{ width: 'auto', margin: '0 auto' }} onClick={handleBack}>
                Return to sanctuary →
              </button>
            </div>
          ) : (
            <div className="profile-flow-wrapper fade-in">
              
              {/* Anonymous Persona Card */}
              <div style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '28px 30px',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--surface-subtle)',
                      border: '1px solid var(--accent-mint-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem'
                    }}>
                      {avatar}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {profile.anonymousDisplayName}
                        </h1>
                        <span style={{
                          fontSize: '0.74rem',
                          backgroundColor: 'rgba(123, 224, 179, 0.1)',
                          border: '1px solid var(--accent-mint-border)',
                          color: 'var(--accent-mint)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 500
                        }}>
                          Student
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Verified anonymous student in BeenThere sanctuary
                      </p>
                    </div>
                  </div>

                  {!isOwnProfile && (
                    <button
                      type="button"
                      className="btn-auth-primary"
                      onClick={() => {
                        if (!isAuthenticated) {
                          navigate(`/login?redirect=/profile/anonymous/${profileId}`);
                        } else {
                          setShowChatModal(true);
                        }
                      }}
                      style={{ width: 'auto', padding: '10px 18px', fontSize: '0.86rem' }}
                    >
                      <span>Talk privately →</span>
                    </button>
                  )}
                </div>

                {/* Stats Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '14px',
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '12px 16px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>
                      Reflections Shared
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {profile.sharedReflectionsCount || 0}
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '12px 16px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>
                      Community Responses
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {profile.responsesCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Public Topics Section */}
              {Array.isArray(profile.topics) && profile.topics.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Broad Public Topics
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {profile.topics.map((t, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.8rem',
                        padding: '4px 12px',
                        backgroundColor: 'var(--surface-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--accent-mint)'
                      }}>
                        #{t.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Publicly Shared Reflections */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Publicly Shared Reflections ({profile.publicPosts?.length || 0})
                </h3>

                {Array.isArray(profile.publicPosts) && profile.publicPosts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {profile.publicPosts.map(p => (
                      <article 
                        key={p.id}
                        style={{
                          backgroundColor: 'var(--surface-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '18px 22px',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/post/${p.id}`, { from: `/profile/anonymous/${profileId}` })}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--accent-mint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {p.category || 'General'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>

                        <p style={{ margin: '6px 0 12px', fontSize: '0.95rem', lineHeight: '1.55', color: 'var(--text-primary)' }}>
                          “{p.content}”
                        </p>

                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-mint)',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            padding: 0,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>Read reflection</span>
                          <span>→</span>
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '28px',
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px dashed var(--border)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      This student has not shared public reflections yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Anonymous Sanctuary Guarantee Notice */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <strong>Anonymous Identity System</strong> — In accordance with BeenThere sanctuary principles, real names, contact information, and personal account credentials are strictly protected and never revealed. Students are recognized solely through their anonymous personas.
                </p>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* 1-to-1 Conversation Modal targeted at this student */}
      {showChatModal && profile && (
        <RequestConversationModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          experience={{
            id: profile.publicPosts?.[0]?.id || `profile-${profileId}`,
            title: `Conversation with ${profile.anonymousDisplayName}`,
            targetAnonymousProfileId: profileId,
            recipientName: profile.anonymousDisplayName
          }}
        />
      )}

      <Footer 
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExploreClick={() => navigate('/explore')}
        onPrivacyClick={() => navigate('/profile')}
        onHowItWorksClick={() => navigate('/')}
      />
    </div>
  );
}
