import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';
import { mapExperienceToUI, mapPostToUI } from '../utils/dataMappers';

const THEMES = [
  { id: 'all', label: 'All themes' },
  { id: 'academic', label: 'Academic' },
  { id: 'career', label: 'Career' },
  { id: 'college life', label: 'College Life' },
  { id: 'social / communication', label: 'Social / Communication' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'mental wellbeing', label: 'Mental Wellbeing' },
  { id: 'other', label: 'Other' }
];

export function ExplorePage() {
  const { navigate } = useRouter();
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

      let mappedExps = rawExps.map(mapExperienceToUI);
      const mappedPosts = rawPosts.map(mapPostToUI);

      const combined = [...mappedExps, ...mappedPosts];
      setExperiences(combined);
      setLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      console.error('Failed to load archive:', err);
      setError('Could not load experience archive.');
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const filteredExperiences = experiences.filter(exp => {
    const matchesTheme = selectedTheme === 'all' || 
      exp.category.toLowerCase().includes(selectedTheme.toLowerCase()) || 
      exp.categoryLabel.toLowerCase().includes(selectedTheme.toLowerCase());

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      exp.excerpt.toLowerCase().includes(query) ||
      exp.whatHappened.toLowerCase().includes(query) ||
      exp.tags.some(t => t.toLowerCase().includes(query)) ||
      exp.context.toLowerCase().includes(query);

    return matchesTheme && matchesSearch;
  });

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="explore-page-main">
        <div className="container">
          
          <header className="explore-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">The Archive</span>
            </div>
            <h1 className="explore-title">Find someone who's been there.</h1>
            <p className="explore-subtext">
              Not curated success stories. Honest reflections from students who survived the exact moment you are in.
            </p>

            {/* Search Input */}
            <div className="explore-search-bar">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search reflections (e.g. failing exam, career doubt, alone in dorm)…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Theme filter pills */}
            <div className="explore-theme-pills" role="tablist">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedTheme === theme.id}
                  className={`theme-pill-btn ${selectedTheme === theme.id ? 'active' : ''}`}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </header>

          {/* Results: Asymmetrical Editorial Composition */}
          {loading ? (
            <div className="state-screen" style={{ minHeight: '300px' }}>
              <p className="state-subtext">Searching through the student sanctuary archive...</p>
            </div>
          ) : error ? (
            <div className="auth-error-banner" style={{ margin: '30px 0' }}>
              <span>{error}</span>
            </div>
          ) : filteredExperiences.length > 0 ? (
            <div className="editorial-collection-layout">
              {filteredExperiences.map((item, index) => {
                const layoutVariant = index === 0 
                  ? 'layout-featured' 
                  : index === 3 
                    ? 'layout-wide' 
                    : (index % 2 === 1 ? 'layout-offset-left' : 'layout-offset-right');

                return (
                  <article 
                    key={item.id} 
                    className={`experience-entry ${layoutVariant}`}
                    onClick={() => navigate(`/experience/${item.id}`)}
                  >
                    <div className="entry-header">
                      <span className="entry-category-badge">{item.categoryLabel}</span>
                      <span className="entry-read-time">{item.readTime}</span>
                    </div>

                    <blockquote className="entry-quote">
                      “{item.excerpt}”
                    </blockquote>

                    {item.whatHappened && (
                      <p className="entry-snippet">
                        {item.whatHappened.slice(0, 140)}…
                      </p>
                    )}

                    <div className="entry-footer">
                      <div className="entry-meta">
                        <span className="meta-author">{item.author}</span>
                        <span className="meta-dot">·</span>
                        <span className="meta-context">{item.context}</span>
                        <span className="meta-dot">·</span>
                        <span className="meta-time">{item.timeAgo}</span>
                      </div>

                      <button 
                        type="button" 
                        className="entry-read-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/experience/${item.id}`);
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
          ) : (
            /* Empty State */
            <div className="empty-state-card">
              <div className="empty-state-icon">💭</div>
              <h3 className="empty-state-title">No one has shared something like this yet.</h3>
              <p className="empty-state-subtext">You could be the first to record this feeling so another student finds comfort.</p>
              <button 
                type="button" 
                className="btn-primary"
                onClick={() => navigate('/share')}
              >
                Share what's on your mind →
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
