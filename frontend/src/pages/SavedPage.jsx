import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';
import { mapExperienceToUI, mapPostToUI } from '../utils/dataMappers';

export function SavedPage() {
  const { navigate } = useRouter();
  const { currentUser, toggleSaveExperience } = useAuth();
  const savedIds = currentUser?.savedExperienceIds || [];

  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const combined = [...rawExps.map(mapExperienceToUI), ...rawPosts.map(mapPostToUI)];
      setExperiences(combined);
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const savedExperiences = experiences.filter(exp => savedIds.includes(exp.id));

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="saved-page-main">
        <div className="container-reading">

          <header className="saved-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">Saved Reflections</span>
            </div>
            <div className="header-flex-row">
              <div>
                <h1 className="saved-title">Experiences you've returned to.</h1>
                <p className="saved-subtext">
                  Reflections you found meaningful. A quiet archive of moments that resonated.
                </p>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="state-screen" style={{ minHeight: '200px' }}>
              <p className="state-subtext">Loading saved reflections...</p>
            </div>
          ) : savedExperiences.length > 0 ? (
            <div className="saved-list">
              {savedExperiences.map((exp) => (
                <article key={exp.id} className="saved-experience-card" onClick={() => navigate(`/experience/${exp.id}`)}>
                  <div className="saved-card-meta">
                    <span className="entry-category-badge">{exp.categoryLabel}</span>
                    <span className="entry-read-time">{exp.readTime}</span>
                  </div>

                  <blockquote className="saved-card-quote">
                    "{exp.excerpt}"
                  </blockquote>

                  {exp.whatHappened && (
                    <p className="saved-card-snippet">
                      {exp.whatHappened.slice(0, 140)}…
                    </p>
                  )}

                  <div className="saved-card-footer">
                    <div className="entry-meta">
                      <span className="meta-author">{exp.author}</span>
                      <span className="meta-dot">·</span>
                      <span className="meta-context">{exp.context}</span>
                      <span className="meta-dot">·</span>
                      <span className="meta-time">{exp.timeAgo}</span>
                    </div>

                    <div className="saved-card-actions">
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
                      <button
                        type="button"
                        className="btn-unsave"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveExperience(exp.id);
                        }}
                        title="Remove from saved"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <div className="empty-state-icon">🤍</div>
              <h3 className="empty-state-title">Nothing saved yet.</h3>
              <p className="empty-state-subtext">
                When an experience resonates, save it here to return to later.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/explore')}
              >
                Explore experiences →
              </button>
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
