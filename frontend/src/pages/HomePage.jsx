import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';
import { mapExperienceToUI, mapPostToUI } from '../utils/dataMappers';

const EXAMPLE_PROBLEMS = [
  "I'm struggling with exams",
  "I feel behind everyone",
  "I'm finding it hard to make friends",
  "I don't know what to do about my career"
];

export function HomePage() {
  const { navigate } = useRouter();
  const { currentUser } = useAuth();

  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.get('/experiences').catch(() => []),
      api.get('/posts').catch(() => [])
    ]).then(([expRes, postsRes]) => {
      if (!isMounted) return;

      const rawExps = Array.isArray(expRes) ? expRes : [];
      const rawPosts = Array.isArray(postsRes) ? postsRes : [];

      let mappedList = rawExps.map(mapExperienceToUI);
      if (mappedList.length === 0) {
        mappedList = rawPosts.map(mapPostToUI);
      }

      setExperiences(mappedList);
      setLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      console.error('Failed to load home experiences:', err);
      setError('Could not load student reflections. Please try again later.');
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const handlePrimaryCta = () => {
    navigate('/share');
  };

  const handleSelectChip = (problemText) => {
    navigate('/share', { content: problemText });
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="home-main">
        {/* COMPACT PRIMARY CTA HERO SECTION (Single writing flow target) */}
        <section className="home-hero-cta-section" style={{ padding: '60px 0 30px' }}>
          <div className="container-reading">
            
            {/* User identity indicator */}
            <div className="home-welcome-meta" style={{ marginBottom: '20px' }}>
              <span className="welcome-avatar">{currentUser?.anonymousAvatar || '🦉'}</span>
              <span className="welcome-identity">{currentUser?.anonymousIdentity || 'Anonymous Student'}</span>
              <span className="welcome-divider">·</span>
              <span className="welcome-context">{currentUser?.academicContext || 'College student'}</span>
              <span className="welcome-divider">·</span>
              <span className="welcome-sanctuary">Private space</span>
            </div>

            <div className="home-cta-box" style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '36px 28px',
              textAlign: 'center'
            }}>
              <h1 className="home-heading" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', marginBottom: '10px' }}>
                What’s on your mind?
              </h1>
              <p className="home-subtext" style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                Sometimes the hardest part is simply saying it.
              </p>

              {/* Primary CTA Button navigating directly to /share */}
              <button 
                type="button" 
                className="btn-auth-primary"
                style={{ 
                  padding: '14px 28px', 
                  fontSize: '1.02rem', 
                  width: 'auto', 
                  margin: '0 auto 24px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}
                onClick={handlePrimaryCta}
              >
                <span>Share what's on your mind →</span>
              </button>

              {/* Privacy pill */}
              <div className="privacy-pill-indicator" style={{ justifyContent: 'center', marginBottom: '24px' }}>
                <span className="privacy-icon-lock" aria-hidden="true">🔒</span>
                <span>Private & anonymous — nothing is published until you choose</span>
              </div>

              {/* Example problem chips */}
              <div className="suggested-prompts" style={{ alignItems: 'center', marginTop: '16px' }}>
                <span className="prompts-label" style={{ marginBottom: '8px' }}>Or start with a common struggle:</span>
                <div className="prompts-list" style={{ justifyContent: 'center', gap: '8px' }}>
                  {EXAMPLE_PROBLEMS.map((problem, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="prompt-chip"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectChip(problem)}
                    >
                      “{problem}”
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Separator line */}
        <div className="container-reading">
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '10px auto 40px' }} />
        </div>

        {/* PEOPLE WHO'VE BEEN HERE BEFORE (Visually secondary section) */}
        <section className="home-experiences-section" style={{ paddingBottom: '60px' }}>
          <div className="container">
            <div className="home-section-header">
              <div>
                <div className="section-label">
                  <span className="label-index">02</span>
                  <span className="label-text">Student Archive</span>
                </div>
                <h2 className="section-title">People who’ve been here before</h2>
                <p className="section-desc">
                  Students who faced something similar.
                </p>
              </div>

              <div className="home-quick-nav-links">
                <button 
                  type="button" 
                  className="quick-nav-link"
                  onClick={() => navigate('/share')}
                >
                  Share what's on your mind →
                </button>
              </div>
            </div>

            {loading ? (
              <div className="state-screen" style={{ minHeight: '200px', padding: '40px 0' }}>
                <p className="state-subtext">Loading reflections from the sanctuary...</p>
              </div>
            ) : error ? (
              <div className="auth-error-banner" style={{ margin: '20px 0' }}>
                <span>{error}</span>
              </div>
            ) : experiences.length === 0 ? (
              <div className="state-screen" style={{ minHeight: '200px', padding: '40px 0' }}>
                <p className="state-subtext">No reflections available yet. Be the first to share your story!</p>
              </div>
            ) : (
              <div className="editorial-collection-layout">
                {experiences.slice(0, 4).map((exp, index) => {
                  const layoutVariant = index === 0 
                    ? 'layout-featured' 
                    : index === 3 
                      ? 'layout-wide' 
                      : (index % 2 === 1 ? 'layout-offset-left' : 'layout-offset-right');

                  return (
                    <article 
                      key={exp.id} 
                      className={`experience-entry ${layoutVariant}`}
                      onClick={() => navigate(`/experience/${exp.id}`)}
                    >
                      <div className="entry-header">
                        <span className="entry-category-badge">{exp.categoryLabel}</span>
                        <span className="entry-read-time">{exp.readTime}</span>
                      </div>

                      <blockquote className="entry-quote">
                        “{exp.excerpt}”
                      </blockquote>

                      {exp.whatHappened && (
                        <p className="entry-snippet">
                          {exp.whatHappened.slice(0, 150)}…
                        </p>
                      )}

                      <div className="entry-footer">
                        <div className="entry-meta">
                          <span className="meta-author">{exp.author}</span>
                          <span className="meta-dot">·</span>
                          <span className="meta-context">{exp.context}</span>
                          <span className="meta-dot">·</span>
                          <span className="meta-time">{exp.timeAgo}</span>
                        </div>

                        <button 
                          type="button" 
                          className="entry-read-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/experience/${exp.id}`);
                          }}
                        >
                          <span>Read experience</span>
                          <span className="arrow" aria-hidden="true">→</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="home-browse-more" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '40px' }}>
              <button 
                type="button" 
                className="btn-browse-all"
                onClick={() => navigate('/explore')}
              >
                Explore all experiences →
              </button>

              <button 
                type="button" 
                className="btn-auth-primary"
                style={{ width: 'auto', padding: '12px 24px' }}
                onClick={() => navigate('/share')}
              >
                Share what's on your mind →
              </button>
            </div>
          </div>
        </section>

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
