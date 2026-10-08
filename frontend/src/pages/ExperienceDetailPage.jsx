import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { CalmLoader } from '../components/CalmLoader';
import { api } from '../config/api';
import { mapExperienceToUI } from '../utils/dataMappers';

export function ExperienceDetailPage() {
  const { match, navigate, routeState } = useRouter();
  const { isExperienceSaved, toggleSaveExperience } = useAuth();
  const id = match.params.id;

  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch canonical experience card from backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      // 1. Check if this ID is actually a student post (if so, redirect to /post/:id)
      try {
        const postRes = await api.get(`/posts/${id}`);
        if (postRes && postRes.id) {
          if (isMounted) {
            navigate(`/post/${id}`);
            return;
          }
        }
      } catch (err) {
        // Not a post, proceed to fetch as experience card
      }

      // 2. Fetch as Experience Card
      let expRes = null;
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

      if (!isMounted) return;

      if (expRes && expRes.id) {
        setExperience(mapExperienceToUI(expRes));
      } else {
        setExperience(null);
      }

      setLoading(false);
    }

    fetchData();
    return () => { isMounted = false; };
  }, [id, navigate]);

  const isSaved = experience ? isExperienceSaved(experience.id) : false;

  if (loading) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="story-reader-main" style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalmLoader label="Loading guidance..." minHeight="360px" />
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
            <h1 className="state-heading">Experience card not found.</h1>
            <p className="state-subtext">Let's find something that does exist in the archive.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/explore')}>
              Explore archive →
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
              ← Back to archive
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="reader-read-time">{experience.readTime || '3 min read'}</span>
              <button
                type="button"
                onClick={() => toggleSaveExperience(experience.id, 'experience', {
                  title: experience.title,
                  excerpt: experience.excerpt || experience.whatHappened,
                  category: experience.categoryLabel || 'General'
                })}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  color: isSaved ? 'var(--accent-mint)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                {isSaved ? '★ Saved' : '☆ Save for later'}
              </button>
            </div>
          </div>

          {/* Canonical Header */}
          <header className="story-meta-header" style={{ marginBottom: '28px' }}>
            <div className="story-tag-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span className="story-category-pill">{experience.categoryLabel || 'General'}</span>
              {(experience.tags || []).map((tag, tIdx) => (
                <span key={tIdx} className="story-mini-tag">#{tag.replace(/^#/, '')}</span>
              ))}
            </div>

            <div className="story-author-byline" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--accent-mint)', fontWeight: 600 }}>💡 Curated Peer Guidance</span>
              <span className="byline-dot">·</span>
              <span className="author-major" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>BeenThere Knowledge Base</span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '14px' }}>
              {experience.title}
            </h1>

            {experience.excerpt && experience.excerpt !== experience.whatHappened && (
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.6', margin: 0 }}>
                “{experience.excerpt}”
              </p>
            )}
          </header>

          {/* Structured Guidance Narrative */}
          <div className="story-narrative-flow" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* 1. What Happened / Situation */}
            {experience.whatHappened && (
              <section className="story-chapter" style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '24px'
              }}>
                <h2 className="chapter-label" style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-mint)', marginBottom: '12px' }}>
                  THE SITUATION
                </h2>
                <div className="chapter-prose">
                  <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-primary)', margin: 0 }}>
                    {experience.whatHappened}
                  </p>
                </div>
              </section>
            )}

            {/* 2. What Helped */}
            {Array.isArray(experience.whatHelped) && experience.whatHelped.length > 0 && (
              <section className="story-chapter helped-highlight-chapter" style={{
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--accent-mint-border)',
                borderRadius: '8px',
                padding: '24px'
              }}>
                <h2 className="chapter-label" style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-mint)', marginBottom: '12px' }}>
                  WHAT HELPED
                </h2>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {experience.whatHelped.map((item, idx) => (
                    <li key={idx} style={{ fontSize: '0.96rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 3. What Changed */}
            {experience.whatChanged && (
              <section className="story-chapter" style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '24px'
              }}>
                <h2 className="chapter-label" style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-mint)', marginBottom: '12px' }}>
                  WHAT CHANGED
                </h2>
                <div className="chapter-prose">
                  <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-primary)', margin: 0 }}>
                    {experience.whatChanged}
                  </p>
                </div>
              </section>
            )}

            {/* 4. Where I Am Now */}
            {experience.whereIAmNow && (
              <section className="story-chapter" style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '24px'
              }}>
                <h2 className="chapter-label" style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-mint)', marginBottom: '12px' }}>
                  WHERE I AM NOW
                </h2>
                <div className="chapter-prose">
                  <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-primary)', margin: 0 }}>
                    {experience.whereIAmNow}
                  </p>
                </div>
              </section>
            )}

          </div>

          {/* Institutional Reassurance */}
          <div className="story-sanctuary-banner" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 20px',
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '6px',
            marginTop: '32px'
          }}>
            <span className="banner-shield" aria-hidden="true">🛡</span>
            <p className="banner-text" style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              This experience is part of BeenThere's curated knowledge base, synthesized from recurring student challenges to provide grounded, actionable strategies.
            </p>
          </div>

          {/* Action Box: Share Your Experience */}
          <div style={{
            marginTop: '36px',
            padding: '28px',
            backgroundColor: 'var(--surface-primary)',
            border: '1px dashed var(--border)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Going through this yourself?
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              You can write your personal reflection in the writing sanctuary to find peers who are in the same boat.
            </p>
            <button
              type="button"
              className="btn-auth-primary"
              style={{ width: 'auto', padding: '12px 24px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              onClick={() => navigate('/share')}
            >
              <span>Share your reflection in sanctuary →</span>
            </button>
          </div>

        </article>
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
