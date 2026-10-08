import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { CalmLoader } from '../components/CalmLoader';
import { api } from '../config/api';
import { mapExperienceToUI } from '../utils/dataMappers';

export function MatchingPage() {
  const { routeState, navigate } = useRouter();
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

  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.post('/ai/match', {
      content: userInput,
      category: topic,
      tags: aiAnalysis?.tags || [topic],
      topK: 5
    }).then(res => {
      if (!isMounted) return;
      const matches = res?.matches || [];
      if (matches.length > 0) {
        const mappedMatches = matches.map(mapExperienceToUI);
        // Exclude the current student post if created
        const filtered = mappedMatches.filter(e => e.id !== createdPostId);
        // Strictly cap at Top 5 matches
        setExperiences(filtered.slice(0, 5));
      } else {
        setExperiences([]);
      }
      setLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      console.warn('Semantic AI match error:', err.message);
      // NEVER fetch all 36 cards on matching page error - show empty/no-match flow instead
      setExperiences([]);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [createdPostId, userInput, topic]);

  // Determine if a valid semantic match exists
  const hasMatch = experiences.length > 0;

  const handleStartConversation = () => {
    if (createdPostId) {
      navigate(`/experience/${createdPostId}`);
    } else {
      navigate('/share');
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
              subtext="We're looking for experiences that may feel familiar." 
              minHeight="400px"
            />
          ) : (
            <div className="matching-flow-wrapper fade-in">

              {/* 1. AI UNDERSTANDING SECTION (Section 3) */}
              <div className="ai-understanding-banner" style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--accent-mint-border)',
                borderRadius: '6px',
                padding: '24px',
                marginBottom: '32px'
              }}>
                <div className="section-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🧠</span>
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

              {/* 2. MATCHING RESULTS OR NO-MATCH FLOW */}
              {hasMatch ? (
                /* CASE A — RELEVANT MATCHES FOUND */
                <div className="similar-experiences-view fade-in">
                  
                  <header className="results-header" style={{ marginBottom: '24px' }}>
                    <div className="section-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🤝</span>
                      <span className="label-text" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                        PEOPLE WHO'VE BEEN HERE BEFORE
                      </span>
                    </div>
                    <h1 className="results-title" style={{ fontSize: '1.8rem', fontWeight: 500, marginBottom: '6px' }}>
                      We found experiences that may feel familiar.
                    </h1>
                    <p className="results-subtext" style={{ color: 'var(--text-secondary)' }}>
                      These students stood in a similar place. See what they discovered.
                    </p>
                  </header>

                  <div className="matching-results-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {experiences.map((item, idx) => (
                      <article 
                        key={item.id || idx} 
                        className="similar-experience-card"
                        style={{
                          backgroundColor: 'var(--surface-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '24px',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease'
                        }}
                        onClick={() => navigate(`/experience/${item.id}`)}
                      >
                        <div className="similar-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {item.category || topic}
                          </span>
                          <span className="relevance-badge" style={{
                            fontSize: '0.76rem',
                            color: 'var(--accent-mint)',
                            backgroundColor: 'rgba(123, 224, 179, 0.1)',
                            border: '1px solid var(--accent-mint-border)',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontWeight: 500
                          }}>
                            {item.relevanceLabel || 'Similar experience'}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px', lineHeight: '1.4' }}>
                          {item.title}
                        </h3>

                        <blockquote className="similar-quote-text" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                          “{item.excerpt || item.whatHappened}”
                        </blockquote>

                        {item.whatHelped && (
                          <div style={{ marginBottom: '14px', backgroundColor: 'var(--surface-subtle)', padding: '10px 14px', borderRadius: '4px' }}>
                            <span style={{ fontSize: '0.74rem', color: 'var(--accent-mint)', fontWeight: 600, textTransform: 'uppercase' }}>What Helped:</span>
                            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {item.whatHelped}
                            </p>
                          </div>
                        )}

                        <div className="similar-card-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                          <button 
                            type="button" 
                            className="btn-read-story"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/experience/${item.id}`);
                            }}
                          >
                            <span>Read experience →</span>
                          </button>

                          <button 
                            type="button" 
                            className="btn-talk-privately"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              border: '1px solid var(--accent-mint-border)',
                              color: 'var(--accent-mint)',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/experience/${item.id}`);
                            }}
                          >
                            <span>Talk privately →</span>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* 3. IF MATCHES ARE NOT USEFUL / START OWN THREAD (Section 7 & 9) */}
                  <div className="matching-footer-action-box" style={{
                    marginTop: '40px',
                    padding: '28px 24px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      Don't see yourself in these experiences?
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                      That's okay. Your experience can start a new conversation.
                    </p>
                    <button 
                      type="button" 
                      className="btn-auth-primary"
                      style={{ width: 'auto', padding: '12px 24px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      onClick={handleStartConversation}
                    >
                      <span>Start your own conversation →</span>
                    </button>
                  </div>

                </div>
              ) : (
                /* CASE B — NO MATCH FLOW (Section 8 & 20) */
                <div className="no-match-view fade-in" style={{ padding: '20px 0' }}>
                  
                  <header className="results-header" style={{ marginBottom: '28px', textAlign: 'center' }}>
                    <div className="section-label" style={{ marginBottom: '10px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🤝</span>
                      <span className="label-text" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                        NO ONE HAS SHARED A CLOSELY RELATED EXPERIENCE YET
                      </span>
                    </div>
                    <h1 className="results-title" style={{ fontSize: '1.8rem', fontWeight: 400, marginBottom: '10px', color: 'var(--text-primary)' }}>
                      We couldn't find an experience that closely matches what you're going through.
                    </h1>
                    <p className="results-subtext" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                      Your experience could be the first.
                    </p>
                  </header>

                  <div style={{
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px dashed var(--accent-mint-border)',
                    borderRadius: '6px',
                    padding: '36px 24px',
                    textAlign: 'center',
                    margin: '20px 0 32px'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🌱</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>
                      Start this conversation
                    </h3>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
                      Other students facing this situation will be able to read your post and respond with their own support and perspective.
                    </p>

                    <button 
                      type="button" 
                      className="btn-auth-primary"
                      style={{ padding: '14px 28px', fontSize: '1rem', width: 'auto', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      onClick={handleStartConversation}
                    >
                      <span>Start this conversation →</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

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
