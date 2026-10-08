import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { CalmLoader } from '../components/CalmLoader';
import { api } from '../config/api';
import { mapExperienceToUI, mapPostToUI } from '../utils/dataMappers';

import { RequestConversationModal } from '../components/RequestConversationModal';

export function ExperienceDetailPage() {
  const { match, navigate } = useRouter();
  const { isExperienceSaved, toggleSaveExperience, isAuthenticated, currentUser } = useAuth();
  const id = match.params.id;

  const [experience, setExperience] = useState(null);
  const [isPostOnly, setIsPostOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [newResponseContent, setNewResponseContent] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [justSubmittedId, setJustSubmittedId] = useState(null);

  const [helpedCount, setHelpedCount] = useState(12);
  const [hasHelped, setHasHelped] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showConvModal, setShowConvModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');

  // Fetch experience / post details and real responses from Supabase backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      let postRes = null;
      let expRes = null;
      let respRes = [];

      // 1. Try fetching as Student Post
      try {
        postRes = await api.get(`/posts/${id}`);
      } catch (err) {
        postRes = null;
      }

      // 2. Try fetching as Experience Card
      try {
        expRes = await api.get(`/experiences/${id}`);
      } catch (err) {
        try {
          const expsList = await api.get('/experiences');
          if (Array.isArray(expsList)) {
            expRes = expsList.find(e => e.id === id);
          }
        } catch (e2) {
          expRes = null;
        }
      }

      // 3. Fetch responses for this thread
      try {
        const r = await api.get(`/responses?postId=${id}`);
        if (Array.isArray(r)) respRes = r;
      } catch (err) {
        respRes = [];
      }

      if (!isMounted) return;

      if (postRes && postRes.id) {
        setExperience(mapPostToUI(postRes));
        setIsPostOnly(true);
      } else if (expRes && expRes.id) {
        setExperience(mapExperienceToUI(expRes));
        setIsPostOnly(false);
        setHelpedCount(expRes.helpfulCount || 12);
      } else {
        setExperience(null);
        setIsPostOnly(false);
      }

      setResponses(respRes);
      setLoading(false);
    }

    fetchData();
    return () => { isMounted = false; };
  }, [id]);

  const refreshResponses = async () => {
    try {
      const respRes = await api.get(`/responses?postId=${id}`);
      if (Array.isArray(respRes)) {
        setResponses(respRes);
      }
    } catch (err) {
      console.error('Failed to refresh responses:', err);
    }
  };

  const handleHelpToggle = () => {
    if (!hasHelped) {
      setHelpedCount(prev => prev + 1);
      setHasHelped(true);
    } else {
      setHelpedCount(prev => prev - 1);
      setHasHelped(false);
    }
  };

  // Response Composer - Send anonymously →
  const handleCreateResponse = async (e) => {
    e.preventDefault();
    if (!newResponseContent.trim() || isSubmittingResponse) return;

    if (!isAuthenticated) {
      navigate(`/login?redirect=/experience/${id}`);
      return;
    }

    setIsSubmittingResponse(true);
    try {
      const created = await api.post('/responses', {
        postId: id,
        content: newResponseContent.trim()
      });

      setNewResponseContent('');
      setIsSubmittingResponse(false);
      setJustSubmittedId(created?.id || 'newly-created');

      // Instantly refresh list from Supabase
      await refreshResponses();
    } catch (err) {
      console.error('Failed to submit response:', err);
      setIsSubmittingResponse(false);
      alert(err.message || 'Failed to submit response. Please try again.');
    }
  };

  const handleReportSubmit = async (reason) => {
    setReportError('');
    try {
      await api.post('/reports', {
        targetType: 'post',
        targetId: id || 'exp-1',
        reason
      });

      setReportSubmitted(true);
      setTimeout(() => {
        setShowReportDialog(false);
        setReportSubmitted(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to send report:', err);
      setReportError(err.message || 'Failed to send report');
    }
  };

  const isSaved = experience ? isExperienceSaved(experience.id) : false;

  if (loading) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="story-reader-main" style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalmLoader label="Finding your reflection..." minHeight="360px" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="state-screen">
          <div className="container-reading text-center">
            <h1 className="state-heading">Looks like this reflection doesn't exist.</h1>
            <p className="state-subtext">Let's find something that does.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/explore')}>
              Explore experiences →
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="story-reader-main">
        <article className="container-reading story-reader-container">
          
          {/* Navigation link */}
          <div className="reader-top-nav">
            <button 
              type="button" 
              className="back-nav-btn"
              onClick={() => navigate('/explore')}
            >
              ← Back to reflections
            </button>
            <span className="reader-read-time">{experience.readTime || '3 min read'}</span>
          </div>

          {/* Anonymous Attribution Header */}
          <header className="story-meta-header">
            <div className="story-tag-row">
              <span className="story-category-pill">{experience.categoryLabel || 'General'}</span>
              {(experience.tags || []).map((tag, tIdx) => (
                <span key={tIdx} className="story-mini-tag">#{tag.replace(/^#/, '')}</span>
              ))}
            </div>

            <div className="story-author-byline">
              <span className="author-anon">{experience.author || 'Anonymous Student'}</span>
              <span className="byline-dot">·</span>
              <span className="author-major">{experience.context || 'College student'}</span>
              <span className="byline-dot">·</span>
              <span className="story-date">{experience.timeAgo || 'Recently'}</span>
            </div>

            {/* Opening Quote / Title */}
            <h1 className="story-opening-statement">
              “{experience.excerpt || experience.whatHappened}”
            </h1>
          </header>

          {/* Story Content: Full Experience vs Post Discussion */}
          {!isPostOnly && (experience.whatHappened || experience.whatChanged) ? (
            /* FULL EXPERIENCE CARD (Requirement 11) */
            <div className="story-narrative-flow">
              
              {/* 1. What Happened */}
              {experience.whatHappened && (
                <section className="story-chapter">
                  <h2 className="chapter-label">WHAT HAPPENED</h2>
                  <div className="chapter-prose">
                    <p>{experience.whatHappened}</p>
                  </div>
                </section>
              )}

              {/* 2. What Changed */}
              {experience.whatChanged && (
                <section className="story-chapter">
                  <h2 className="chapter-label">WHAT CHANGED</h2>
                  <div className="chapter-prose">
                    <p>{experience.whatChanged}</p>
                  </div>
                </section>
              )}

              {/* 3. What Helped */}
              {experience.whatHelped && (
                <section className="story-chapter helped-highlight-chapter">
                  <h2 className="chapter-label">WHAT HELPED</h2>
                  <ul className="helped-bullets-list">
                    {Array.isArray(experience.whatHelped) ? (
                      experience.whatHelped.map((item, idx) => (
                        <li key={idx}>
                          <span className="bullet-dash">—</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li>
                        <span className="bullet-dash">—</span>
                        <span>{experience.whatHelped}</span>
                      </li>
                    )}
                  </ul>
                </section>
              )}

              {/* 4. Where I Am Now */}
              {experience.whereIAmNow && (
                <section className="story-chapter">
                  <h2 className="chapter-label">WHERE I AM NOW</h2>
                  <div className="chapter-prose">
                    <p>{experience.whereIAmNow}</p>
                  </div>
                </section>
              )}

            </div>
          ) : (
            /* NO MATCH / NEW DISCUSSION POST VIEW (Requirement 12) */
            <div className="story-narrative-flow">
              <section className="story-chapter">
                <div className="section-label" style={{ marginBottom: '12px' }}>
                  <span className="label-index">03</span>
                  <span className="label-text">START THE CONVERSATION</span>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  No one has shared a similar experience yet. Be the first to open this conversation.
                </p>
                <div className="full-text-inspection" style={{ padding: '20px', borderRadius: '6px', background: 'var(--surface-primary)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
                    “{experience.excerpt || experience.whatHappened}”
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* Sanctuary Reassurance */}
          <div className="story-sanctuary-banner" style={{ marginTop: '30px' }}>
            <span className="banner-shield" aria-hidden="true">🛡</span>
            <p className="banner-text">
              The author’s real identity is strictly shielded. All contributions remain 100% anonymous.
            </p>
          </div>

          {/* 1-TO-1 ANONYMOUS PRIVATE CONVERSATION ENTRY POINT (Requirement 1) */}
          <div style={{
            marginTop: '30px',
            backgroundColor: 'var(--surface-primary, #18221d)',
            border: '1px solid var(--accent-mint-border, #2c5e4b)',
            borderRadius: '10px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>💬</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                Feel like talking to someone who's been there?
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.5' }}>
              Send an anonymous conversation request. They can accept or decline.
            </p>
            <div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate(`/login?redirect=/experience/${id}`);
                  } else {
                    setShowConvModal(true);
                  }
                }}
                style={{ padding: '12px 24px', fontSize: '0.92rem', fontWeight: 600 }}
              >
                Talk privately →
              </button>
            </div>
          </div>

          {/* DISCUSSION SECTION (Requirement 11, 12, 13, 14) */}
          <div className="story-chapter" style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border)' }}>
            <h2 className="chapter-label" style={{ fontSize: '1rem', letterSpacing: '0.06em' }}>
              DISCUSSION ({responses.length})
            </h2>

            <div className="responses-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
              {responses.length === 0 ? (
                <div style={{
                  padding: '24px',
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px dashed var(--border)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                    No responses yet. You can leave your own perspective while you wait for someone who has been through it.
                  </p>
                </div>
              ) : (
                responses.map((r, idx) => {
                  const isUserResponse = currentUser && (r.anonymousDisplayName === currentUser.anonymousIdentity || r.id === justSubmittedId);
                  
                  return (
                    <div 
                      key={r.id || idx} 
                      style={{ 
                        background: 'var(--surface-primary)', 
                        padding: '18px 20px', 
                        borderRadius: '6px', 
                        border: isUserResponse ? '1px solid var(--accent-mint-border)' : '1px solid var(--border)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.82rem', color: isUserResponse ? 'var(--accent-mint)' : 'var(--text-secondary)', fontWeight: 500 }}>
                          {isUserResponse ? `YOU · ${currentUser?.anonymousIdentity || 'Anonymous Student'}` : (r.anonymousDisplayName || 'Anonymous Peer')}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.94rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                        {r.content}
                      </p>

                      {isUserResponse && (
                        <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--accent-mint)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>✓ Shared anonymously</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* RESPONSE COMPOSER AT THE BOTTOM (Requirement 13 & 14) */}
            <div className="response-composer-box" style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '24px',
              marginTop: '28px'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
                WHAT DO YOU THINK?
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                You can share what helped, what you learned, or simply let them know they are not alone.
              </p>

              <form onSubmit={handleCreateResponse}>
                <textarea
                  className="writing-textarea"
                  rows={4}
                  placeholder="Write an anonymous response..."
                  value={newResponseContent}
                  onChange={(e) => setNewResponseContent(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '12px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    marginBottom: '14px',
                    outline: 'none'
                  }}
                  required
                />

                <button
                  type="submit"
                  className="btn-auth-primary"
                  style={{ width: 'auto', padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  disabled={!newResponseContent.trim() || isSubmittingResponse}
                >
                  {isSubmittingResponse ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="calm-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#090A0C' }} />
                      <span>Sending...</span>
                    </span>
                  ) : (
                    <span>Send anonymously →</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Action Bar */}
          <div className="story-resolution-section" style={{ marginTop: '50px' }}>
            <h3 className="resolution-question">Could this help you?</h3>
            
            <div className="resolution-actions-bar">
              <button 
                type="button" 
                className={`btn-this-helped ${hasHelped ? 'helped-active' : ''}`}
                onClick={handleHelpToggle}
                aria-pressed={hasHelped}
              >
                <span className="helped-icon">{hasHelped ? '✓' : '🤍'}</span>
                <span>{hasHelped ? 'Marked as helpful' : 'This helped me'}</span>
                <span className="helped-badge-count">{helpedCount}</span>
              </button>

              <button 
                type="button" 
                className={`btn-this-helped ${isSaved ? 'helped-active' : ''}`}
                onClick={() => toggleSaveExperience(experience.id)}
                aria-pressed={isSaved}
              >
                <span className="helped-icon">{isSaved ? '🔖' : '🏷️'}</span>
                <span>{isSaved ? 'Saved to collection' : 'Save for later'}</span>
              </button>

              <button 
                type="button" 
                className="btn-read-another"
                onClick={() => navigate('/explore')}
              >
                Read another experience →
              </button>
            </div>

            <div className="resolution-secondary-row">
              <button 
                type="button" 
                className="secondary-action-link"
                onClick={() => navigate('/share')}
              >
                Share my own experience
              </button>

              <span className="sep-divider">·</span>

              <button 
                type="button" 
                className="secondary-action-link danger"
                onClick={() => setShowReportDialog(true)}
              >
                Report this reflection
              </button>
            </div>
          </div>

        </article>
      </main>

      {/* Report Modal */}
      {showReportDialog && (
        <div className="modal-backdrop" onClick={() => setShowReportDialog(false)} role="dialog" aria-modal="true">
          <div className="modal-sheet report-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <span className="crumb-badge">Community Care Report</span>
              <button type="button" className="modal-close-btn" onClick={() => setShowReportDialog(false)}>✕</button>
            </div>
            
            {reportSubmitted ? (
              <div className="report-success-state">
                <span className="report-success-icon">✓</span>
                <h3>Thank you for looking out for others.</h3>
                <p>Our student moderation team will quietly review this entry within 1 hour.</p>
              </div>
            ) : (
              <div className="report-form-body">
                <h3 className="report-heading">Report this experience</h3>
                <p className="report-sub">
                  BeenThere is a sanctuary. Let us know if this post violates safety guidelines.
                </p>
                {reportError && (
                  <div className="auth-error-banner" style={{ marginBottom: '16px' }}>
                    <span>{reportError}</span>
                  </div>
                )}
                <div className="report-options">
                  <button type="button" className="report-option-btn" onClick={() => handleReportSubmit('Contains real names or personal identifiers')}>
                    Contains real names or personal identifiers
                  </button>
                  <button type="button" className="report-option-btn" onClick={() => handleReportSubmit('Acute self-harm or medical emergency concern')}>
                    Acute self-harm or medical emergency concern
                  </button>
                  <button type="button" className="report-option-btn" onClick={() => handleReportSubmit('Hostile language, harassment, or spam')}>
                    Hostile language, harassment, or spam
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Conversation Modal */}
      <RequestConversationModal
        isOpen={showConvModal}
        onClose={() => setShowConvModal(false)}
        experience={experience}
      />

      <Footer 
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExploreClick={() => navigate('/explore')}
        onPrivacyClick={() => navigate('/profile')}
        onHowItWorksClick={() => navigate('/')}
      />
    </div>
  );
}
