import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';

const TOPICS = [
  'Academic',
  'Career',
  'College Life',
  'Social / Communication',
  'Relationships',
  'Mental Wellbeing',
  'Other'
];

export function SharePage() {
  const { navigate, routeState } = useRouter();
  const { isAuthenticated, loadingSession } = useAuth();

  const [content, setContent] = useState(routeState?.content || '');
  const [selectedTopic, setSelectedTopic] = useState('Academic');
  const [isFocused, setIsFocused] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // AI Understanding state
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Protect route: redirect unauthenticated users to login with return redirect
  useEffect(() => {
    if (!loadingSession && !isAuthenticated) {
      navigate('/login?redirect=/share');
    }
  }, [loadingSession, isAuthenticated, navigate]);

  if (loadingSession) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="share-page-main">
          <div className="container-reading state-screen" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="state-subtext">Verifying session…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Step 1: Handle "Understand my experience →"
  const handleUnderstand = async (e) => {
    if (e) e.preventDefault();
    if (!content.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMessage('');

    try {
      const res = await api.post('/ai/analyze', {
        content: content.trim(),
        categoryHint: selectedTopic,
        topic: selectedTopic
      });

      setAiAnalysis(res);
      setIsAnalyzing(false);
    } catch (err) {
      console.error('AI analysis error:', err);
      setIsAnalyzing(false);
      // Fallback preview if network issues occur
      setAiAnalysis({
        category: selectedTopic || 'Academic',
        situation: content.trim().slice(0, 90),
        need: 'Practical support & peer perspective',
        tags: [selectedTopic || 'Academic', 'Peer Support'],
        risk: 'low',
        source: 'fallback',
        model: null
      });
    }
  };

  // Step 2: Handle "Share anonymously & find similar experiences →"
  const handleConfirmPublish = async () => {
    if (!content.trim() || isPublishing) return;

    setIsPublishing(true);
    setErrorMessage('');

    try {
      // Create real post in Supabase
      const newPost = await api.post('/posts', {
        content: content.trim(),
        category: aiAnalysis?.category || selectedTopic,
        tags: aiAnalysis?.tags || [selectedTopic]
      });

      setIsPublishing(false);

      const createdPostId = newPost?.id;

      // Navigate to /matching?postId=REAL_POST_ID passing created post ID in URL and route state
      if (createdPostId) {
        navigate(`/matching?postId=${createdPostId}`, {
          userInput: content.trim(),
          topic: selectedTopic,
          postId: createdPostId,
          aiAnalysis
        });
      } else {
        navigate('/matching', {
          userInput: content.trim(),
          topic: selectedTopic,
          aiAnalysis
        });
      }
    } catch (err) {
      console.error('Failed to publish post:', err);
      setIsPublishing(false);
      if (err.status === 401) {
        navigate('/login?redirect=/share');
      } else {
        setErrorMessage(err.message || 'Failed to submit post to the sanctuary. Please try again.');
      }
    }
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="share-page-main">
        <div className="container-reading">
          
          <div className="share-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">Writing Sanctuary</span>
            </div>
            <h1 className="share-title">Tell us what's going on.</h1>
            <p className="share-subtext">
              No one is grading this. Write whatever is weighing on your mind—unfiltered, imperfect, and completely private.
            </p>
          </div>

          {errorMessage && (
            <div className="auth-error-banner" style={{ marginBottom: '20px' }}>
              <span>{errorMessage}</span>
            </div>
          )}

          {!aiAnalysis ? (
            /* Writing Phase */
            <form onSubmit={handleUnderstand} className="share-interactive-form">
              
              {/* Optional Theme Pills */}
              <div className="share-topic-selector">
                <span className="topic-selector-label">Optional theme:</span>
                <div className="topic-pill-group">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className={`topic-select-pill ${selectedTopic === topic ? 'selected' : ''}`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Writing Area */}
              <div className={`share-writing-box ${isFocused ? 'focused' : ''}`}>
                <textarea
                  className="share-textarea"
                  rows={9}
                  placeholder="I'm scared I'm going to fail my coding exam. I study a lot but still can't understand the problems…"
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setErrorMessage(''); }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  aria-label="Your thoughts"
                  autoFocus
                />

                <div className="share-box-bottom">
                  <div className="share-privacy-note">
                    <span className="note-lock">🔒</span>
                    <span>Nothing is shared until you decide. Your identity is protected.</span>
                  </div>

                  <div className="share-char-count">
                    {content.length > 0 && `${content.split(/\s+/).filter(Boolean).length} words`}
                  </div>
                </div>
              </div>

              {/* Primary Action BEFORE AI */}
              <div className="share-action-row">
                <button 
                  type="submit" 
                  className={`btn-find-similar-primary ${content.trim() && !isAnalyzing ? 'active' : ''}`}
                  disabled={!content.trim() || isAnalyzing}
                >
                  <span>{isAnalyzing ? 'Understanding your experience…' : 'Understand my experience →'}</span>
                </button>
              </div>

            </form>
          ) : (
            /* Compact AI Preview Phase */
            <div className="ai-preview-card" style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--accent-mint-border)',
              borderRadius: '6px',
              padding: '24px',
              marginTop: '10px'
            }}>
              <div className="section-label" style={{ marginBottom: '12px' }}>
                <span className="label-index">AI</span>
                <span className="label-text">YOUR EXPERIENCE, UNDERSTOOD</span>
              </div>

              <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Category</span>
                  <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{aiAnalysis.category}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Situation</span>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>“{aiAnalysis.situation}”</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Need</span>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{aiAnalysis.need}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tags</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(aiAnalysis.tags || []).map((tag, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.76rem',
                        padding: '3px 8px',
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
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-auth-secondary"
                  style={{ width: 'auto', padding: '10px 18px' }}
                  onClick={() => setAiAnalysis(null)}
                >
                  Edit reflection
                </button>

                <button
                  type="button"
                  className="btn-auth-primary"
                  style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={isPublishing}
                  onClick={handleConfirmPublish}
                >
                  <span>{isPublishing ? 'Publishing post…' : 'Share anonymously & find similar experiences →'}</span>
                </button>
              </div>
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
