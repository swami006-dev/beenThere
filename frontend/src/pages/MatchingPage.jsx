import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { CalmLoader } from '../components/CalmLoader';
import { RequestConversationModal } from '../components/RequestConversationModal';
import { api } from '../config/api';
import { mapExperienceToUI, mapPostToUI } from '../utils/dataMappers';

export function MatchingPage() {
  const { routeState, navigate } = useRouter();
  const { isAuthenticated } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const urlPostId = searchParams.get('postId');
  const createdPostId = urlPostId || routeState?.postId;

  const [resolvedInput, setResolvedInput] = useState(routeState?.userInput || '');
  const [resolvedTopic, setResolvedTopic] = useState(routeState?.topic || 'Academic');
  const [resolvedAi, setResolvedAi] = useState(routeState?.aiAnalysis || null);

  useEffect(() => {
    if (!routeState?.userInput && createdPostId) {
      api.get(`/posts/${createdPostId}`)
        .then(post => {
          if (post?.content) {
            setResolvedInput(post.content);
            if (post.category) setResolvedTopic(post.category);
          }
        })
        .catch(e => console.warn('Could not fetch post details for matching:', e.message));
    }
  }, [createdPostId, routeState]);

  const userInput = resolvedInput || routeState?.userInput || "I'm scared I'm going to fail my coding exam and disappoint everyone.";
  const topic = resolvedTopic || routeState?.topic || 'Academic';
  const aiAnalysis = resolvedAi || routeState?.aiAnalysis;

  const [canonicalExperience, setCanonicalExperience] = useState(null);
  const [studentPosts, setStudentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostForChat, setSelectedPostForChat] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.post('/ai/match', {
      content: userInput,
      category: topic,
      tags: aiAnalysis?.tags || [topic],
      excludePostId: createdPostId,
      topK: 5
    }).then(res => {
      if (!isMounted) return;

      // 1. Process Canonical Experience Card
      if (res?.canonicalExperience) {
        setCanonicalExperience(mapExperienceToUI(res.canonicalExperience));
      } else {
        setCanonicalExperience(null);
      }

      // 2. Process Real Student Posts
      const postsList = Array.isArray(res?.studentPosts) ? res.studentPosts : [];
      const mappedPosts = postsList
        .filter(p => p.id !== createdPostId)
        .map(mapPostToUI);
      setStudentPosts(mappedPosts);

      setLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      console.warn('Semantic AI match error:', err.message);
      setCanonicalExperience(null);
      setStudentPosts([]);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [createdPostId, userInput, topic]);

  const hasAnyMatch = canonicalExperience || studentPosts.length > 0;

  const handleStartConversation = () => {
    if (createdPostId) {
      navigate(`/post/${createdPostId}`);
    } else {
      navigate('/share');
    }
  };

  const handleTalkPrivately = (post) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/matching?postId=${createdPostId || ''}`);
    } else {
      setSelectedPostForChat(post);
    }
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="matching-page-main">
        <div className="container-reading">

          {/* LOADING STATE */}
          {loading ? (
            <CalmLoader 
              label="Finding people who've been here before..." 
              subtext="We're looking for guidance and reflections that may feel familiar." 
              minHeight="400px"
            />
          ) : (
            <div className="matching-flow-wrapper fade-in">

              {/* 1. AI UNDERSTANDING SECTION */}
              <div className="ai-understanding-banner" style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--accent-mint-border)',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '32px'
              }}>
                <div className="section-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.15rem' }}>🧠</span>
                  <span className="label-text" style={{ color: 'var(--accent-mint)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    WE UNDERSTOOD
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      You're dealing with...
                    </span>
                    <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '4px', lineHeight: '1.5' }}>
                      “{aiAnalysis?.situation || userInput}”
                    </p>
                  </div>

                  {aiAnalysis?.need && (
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        You may be looking for...
                      </span>
                      <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {aiAnalysis.need}
                      </p>
                    </div>
                  )}

                  {aiAnalysis?.tags && aiAnalysis.tags.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                        Topics:
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {aiAnalysis.tags.map((tag, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.76rem',
                            padding: '3px 10px',
                            backgroundColor: 'var(--surface-subtle)',
                            border: '1px solid var(--border)',
                            borderRadius: '3px',
                            color: 'var(--accent-mint)'
                          }}>
                            #{tag.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. CANONICAL EXPERIENCE CARD (WHAT OTHERS HAVE LEARNED) */}
              {canonicalExperience && (
                <section className="canonical-guidance-section" style={{ marginBottom: '36px' }}>
                  <header style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.15rem' }}>💡</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-mint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        WHAT OTHERS HAVE LEARNED
                      </span>
                    </div>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Curated peer guidance synthesized from students who navigated this situation.
                    </p>
                  </header>

                  <article 
                    className="canonical-card"
                    style={{
                      backgroundColor: 'var(--surface-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '24px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {canonicalExperience.category || topic}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--accent-mint)',
                        backgroundColor: 'rgba(123, 224, 179, 0.1)',
                        border: '1px solid var(--accent-mint-border)',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontWeight: 500
                      }}>
                        Curated Guidance
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', lineHeight: '1.35' }}>
                      {canonicalExperience.title}
                    </h2>

                    <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                      {canonicalExperience.excerpt || canonicalExperience.whatHappened}
                    </p>

                    {Array.isArray(canonicalExperience.whatHelped) && canonicalExperience.whatHelped.length > 0 && (
                      <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '14px 18px', borderRadius: '6px', marginBottom: '18px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--accent-mint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          What Helped:
                        </span>
                        <ul style={{ margin: '8px 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {canonicalExperience.whatHelped.map((bullet, bIdx) => (
                            <li key={bIdx} style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                      <button
                        type="button"
                        className="btn-read-story"
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid var(--accent-mint-border)',
                          color: 'var(--accent-mint)',
                          padding: '8px 18px',
                          borderRadius: '4px',
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => navigate(`/experience/${canonicalExperience.id}`, {
                          from: '/matching',
                          matchingState: {
                            userInput,
                            topic,
                            aiAnalysis,
                            postId: createdPostId
                          }
                        })}
                      >
                        <span>Read full guidance →</span>
                      </button>
                    </div>
                  </article>
                </section>
              )}

              {/* 3. STUDENTS WHO'VE BEEN HERE (REAL PEER REFLECTIONS) */}
              <section className="peer-reflections-section" style={{ marginBottom: '36px' }}>
                <header style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.15rem' }}>🤝</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      STUDENTS WHO'VE BEEN HERE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Real reflections from students facing similar challenges. You can read their reflections or connect privately.
                  </p>
                </header>

                {studentPosts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {studentPosts.map((post, idx) => (
                      <article 
                        key={post.id || idx}
                        style={{
                          backgroundColor: 'var(--surface-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '20px 24px',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>{post.anonymousAvatar || '🦉'}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {post.author}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              · {post.timeAgo}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '0.74rem',
                            color: 'var(--accent-mint)',
                            backgroundColor: 'rgba(123, 224, 179, 0.08)',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {post.relevanceLabel || 'Similar reflection'}
                          </span>
                        </div>

                        <blockquote style={{
                          margin: '12px 0 16px',
                          paddingLeft: '14px',
                          borderLeft: '2px solid var(--accent-mint-border)',
                          fontStyle: 'italic',
                          color: 'var(--text-primary)',
                          fontSize: '0.96rem',
                          lineHeight: '1.55'
                        }}>
                          “{post.content}”
                        </blockquote>

                        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                          <button
                            type="button"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              padding: '7px 14px',
                              borderRadius: '4px',
                              fontSize: '0.84rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/post/${post.id}`, {
                              from: '/matching',
                              matchingState: {
                                userInput,
                                topic,
                                aiAnalysis,
                                postId: createdPostId
                              }
                            })}
                          >
                            <span>Read reflection →</span>
                          </button>

                          <button
                            type="button"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              border: '1px solid var(--accent-mint-border)',
                              color: 'var(--accent-mint)',
                              padding: '7px 14px',
                              borderRadius: '4px',
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                            onClick={() => handleTalkPrivately(post)}
                          >
                            <span>Talk privately →</span>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  /* EMPTY STATE FOR STUDENT POSTS */
                  <div style={{
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px dashed var(--border)',
                    borderRadius: '8px',
                    padding: '28px 20px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🌱</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      No students have shared something closely related yet.
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 18px', lineHeight: '1.5' }}>
                      Your experience could be the first to open this door for someone else.
                    </p>
                    <button
                      type="button"
                      className="btn-auth-primary"
                      style={{ width: 'auto', padding: '10px 20px', margin: '0 auto', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={handleStartConversation}
                    >
                      <span>Start your own conversation →</span>
                    </button>
                  </div>
                )}
              </section>

              {/* 4. IF NEITHER MATCHES FLOW */}
              {!hasAnyMatch && (
                <div style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px dashed var(--accent-mint-border)',
                  borderRadius: '8px',
                  padding: '36px 24px',
                  textAlign: 'center',
                  marginTop: '20px'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🌱</div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    No closely related experience yet.
                  </h2>
                  <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                    Your experience could be the first. Starting this conversation helps other students find solidarity when they face this too.
                  </p>
                  <button
                    type="button"
                    className="btn-auth-primary"
                    style={{ padding: '12px 24px', width: 'auto', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    onClick={handleStartConversation}
                  >
                    <span>Start your own conversation →</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* 1-to-1 CONVERSATION MODAL TARGETED AT REAL STUDENT POST */}
      {selectedPostForChat && (
        <RequestConversationModal
          isOpen={!!selectedPostForChat}
          onClose={() => setSelectedPostForChat(null)}
          experience={selectedPostForChat}
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
