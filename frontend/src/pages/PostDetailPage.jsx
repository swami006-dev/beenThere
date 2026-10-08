import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { CalmLoader } from '../components/CalmLoader';
import { RequestConversationModal } from '../components/RequestConversationModal';
import { api } from '../config/api';
import { mapPostToUI } from '../utils/dataMappers';

export function PostDetailPage() {
  const { match, navigate, routeState } = useRouter();
  const { isAuthenticated, currentUser, isExperienceSaved, toggleSaveExperience } = useAuth();
  const id = match.params.id;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [newResponseContent, setNewResponseContent] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [justSubmittedId, setJustSubmittedId] = useState(null);
  const [showConvModal, setShowConvModal] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');

  // Scoped helpful reactions state (starts at 0, strictly scoped to post id)
  const [reactionCount, setReactionCount] = useState(0);
  const [userReacted, setUserReacted] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      let postData = null;
      let respData = [];

      try {
        const rawPost = await api.get(`/posts/${id}`);
        if (rawPost) postData = mapPostToUI(rawPost);
      } catch (err) {
        console.warn('Post fetch notice:', err.message);
      }

      try {
        const rawResponses = await api.get(`/responses?postId=${id}`);
        if (Array.isArray(rawResponses)) respData = rawResponses;
      } catch (err) {
        console.warn('Responses fetch notice:', err.message);
      }

      // Fetch scoped reactions for this specific post
      try {
        const reactionRes = await api.get(`/reactions/${id}`);
        if (reactionRes && typeof reactionRes.count === 'number') {
          if (isMounted) {
            setReactionCount(reactionRes.count);
            setUserReacted(!!reactionRes.userReacted);
          }
        }
      } catch (rErr) {
        if (isMounted) {
          setReactionCount(0);
          setUserReacted(false);
        }
      }

      if (!isMounted) return;
      setPost(postData);
      setResponses(respData);
      setLoading(false);
    }

    fetchData();
    return () => { isMounted = false; };
  }, [id]);

  const handleBack = () => {
    if (routeState?.from === '/matching') {
      navigate('/matching', routeState.matchingState || null);
    } else if (routeState?.from) {
      navigate(routeState.from);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/explore');
    }
  };

  const handleToggleReaction = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/post/${id}`);
      return;
    }
    if (reactionLoading) return;
    setReactionLoading(true);

    const nextReacted = !userReacted;
    const nextCount = nextReacted ? reactionCount + 1 : Math.max(0, reactionCount - 1);
    setUserReacted(nextReacted);
    setReactionCount(nextCount);

    try {
      const res = await api.post(`/reactions/${id}`);
      if (res && typeof res.count === 'number') {
        setReactionCount(res.count);
        setUserReacted(!!res.userReacted);
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      setUserReacted(!nextReacted);
      setReactionCount(reactionCount);
    } finally {
      setReactionLoading(false);
    }
  };

  const isSaved = isExperienceSaved(id);
  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/post/${id}`);
      return;
    }
    await toggleSaveExperience(id, 'post', {
      title: post?.content?.substring(0, 60) || 'Student Reflection',
      content: post?.content,
      category: post?.categoryLabel || 'General',
      author: post?.author || 'Anonymous Student'
    });
  };

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

  const handleCreateResponse = async (e) => {
    e.preventDefault();
    if (!newResponseContent.trim() || isSubmittingResponse) return;

    if (!isAuthenticated) {
      navigate(`/login?redirect=/post/${id}`);
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
        targetId: id,
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

  if (loading) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="story-reader-main" style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalmLoader label="Finding reflection..." minHeight="360px" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="state-screen">
          <div className="container-reading text-center">
            <h1 className="state-heading">Looks like this reflection doesn't exist.</h1>
            <p className="state-subtext">It may have been removed or deleted by its author.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/explore')}>
              Explore reflections →
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
          <div className="reader-top-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button 
              type="button" 
              className="back-nav-btn"
              onClick={handleBack}
            >
              ← Back to reflections
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Anonymous Reflection
            </span>
          </div>

          {/* Anonymous Attribution Header */}
          <header className="story-meta-header" style={{ marginBottom: '24px' }}>
            <div className="story-tag-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span className="story-category-pill">{post.categoryLabel || 'General'}</span>
              {(post.tags || []).map((tag, tIdx) => (
                <span key={tIdx} className="story-mini-tag">#{tag.replace(/^#/, '')}</span>
              ))}
            </div>

            <div className="story-author-byline" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.2rem' }}>{post.anonymousAvatar || '🦉'}</span>
              <span className="author-anon" style={{ fontWeight: 600 }}>{post.author || 'Anonymous Student'}</span>
              <span className="byline-dot">·</span>
              <span className="author-major" style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>College student</span>
              <span className="byline-dot">·</span>
              <span className="story-date" style={{ color: 'var(--text-tertiary)', fontSize: '0.84rem' }}>{post.timeAgo || 'Recently'}</span>
            </div>
          </header>

          {/* Full Authentic Student Reflection */}
          <div style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '28px',
            marginBottom: '28px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <p style={{
              fontSize: '1.15rem',
              lineHeight: '1.7',
              color: 'var(--text-primary)',
              margin: 0,
              fontStyle: 'normal'
            }}>
              “{post.content}”
            </p>
          </div>

          {/* Sanctuary Reassurance */}
          <div className="story-sanctuary-banner" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '6px',
            marginBottom: '24px'
          }}>
            <span className="banner-shield" aria-hidden="true">🛡</span>
            <p className="banner-text" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              The author’s real identity is strictly shielded. All contributions remain 100% anonymous.
            </p>
          </div>

          {/* COULD THIS HELP YOU? (Scoped reaction + Save for later) */}
          <div style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '18px 24px',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                Could this help you?
              </span>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Let this student know their words resonated, or bookmark for later.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleToggleReaction}
                style={{
                  backgroundColor: userReacted ? 'rgba(56, 211, 159, 0.12)' : 'transparent',
                  border: userReacted ? '1px solid var(--accent-mint)' : '1px solid var(--border)',
                  color: userReacted ? 'var(--accent-mint)' : 'var(--text-primary)',
                  borderRadius: '6px',
                  padding: '7px 15px',
                  fontSize: '0.86rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                title="Mark as helpful"
              >
                <span>{userReacted ? '❤️' : '🤍'}</span>
                <span>{userReacted ? 'Helped me' : 'This helped me'}</span>
                <span style={{
                  marginLeft: '4px',
                  padding: '1px 6px',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: '10px',
                  fontSize: '0.78rem'
                }}>
                  {reactionCount}
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleSave}
                style={{
                  backgroundColor: isSaved ? 'rgba(56, 211, 159, 0.12)' : 'transparent',
                  border: isSaved ? '1px solid var(--accent-mint)' : '1px solid var(--border)',
                  color: isSaved ? 'var(--accent-mint)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  padding: '7px 15px',
                  fontSize: '0.86rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                title={isSaved ? 'Remove from saved' : 'Save for later'}
              >
                <span>{isSaved ? '★' : '☆'}</span>
                <span>{isSaved ? 'Saved' : 'Save for later'}</span>
              </button>
            </div>
          </div>

          {/* 1-TO-1 ANONYMOUS PRIVATE CONVERSATION ENTRY POINT */}
          <div style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--accent-mint-border)',
            borderRadius: '8px',
            padding: '22px 24px',
            marginBottom: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>💬</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Feel like talking to someone who's been there?
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Send an anonymous conversation request to this student. They can accept or decline.
            </p>
            <div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate(`/login?redirect=/post/${id}`);
                  } else {
                    setShowConvModal(true);
                  }
                }}
                style={{ padding: '10px 22px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                Talk privately →
              </button>
            </div>
          </div>

          {/* DISCUSSION SECTION */}
          <div className="story-chapter" style={{ paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <h2 className="chapter-label" style={{ fontSize: '0.95rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              DISCUSSION ({responses.length})
            </h2>

            <div className="responses-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '16px 0 28px' }}>
              {responses.length === 0 ? (
                <div style={{
                  padding: '24px',
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px dashed var(--border)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                    No responses yet. You can share your perspective or let them know they are not alone.
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
                        padding: '16px 20px', 
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

            {/* RESPONSE COMPOSER */}
            <div className="response-composer-box" style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '22px'
            }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
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
                    padding: '12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.92rem',
                    resize: 'vertical',
                    marginBottom: '14px'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowReportDialog(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Report post
                  </button>

                  <button
                    type="submit"
                    className="btn-auth-primary"
                    disabled={isSubmittingResponse || !newResponseContent.trim()}
                    style={{
                      width: 'auto',
                      padding: '10px 20px',
                      fontSize: '0.88rem'
                    }}
                  >
                    {isSubmittingResponse ? 'Sending...' : 'Send anonymously →'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </article>
      </main>

      {/* 1-to-1 REQUEST MODAL */}
      {showConvModal && (
        <RequestConversationModal
          isOpen={showConvModal}
          onClose={() => setShowConvModal(false)}
          experience={post}
        />
      )}

      {/* REPORT MODAL */}
      {showReportDialog && (
        <div className="modal-backdrop" onClick={() => setShowReportDialog(false)} role="dialog" aria-modal="true">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Report this reflection</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Help keep BeenThere a safe sanctuary for everyone. Why are you reporting this reflection?
            </p>
            {reportError && <div className="auth-error-banner" style={{ marginBottom: '12px' }}>{reportError}</div>}
            {reportSubmitted ? (
              <p style={{ color: 'var(--accent-mint)', fontWeight: 500 }}>Report submitted. Thank you.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => handleReportSubmit('Harassment or abusive language')}>Harassment or abuse</button>
                <button type="button" className="btn-secondary" onClick={() => handleReportSubmit('Self-harm or crisis concern')}>Self-harm or crisis</button>
                <button type="button" className="btn-secondary" onClick={() => handleReportSubmit('Revealing private personal identity')}>Personal identity leak</button>
                <button type="button" className="btn-secondary" onClick={() => setShowReportDialog(false)} style={{ marginTop: '8px' }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
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
