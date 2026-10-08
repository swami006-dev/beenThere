import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';
import { mapExperienceToUI, mapPostToUI } from '../utils/dataMappers';

export function CommunityPage() {
  const { navigate } = useRouter();
  const [helpedMap, setHelpedMap] = useState({});
  const [items, setItems] = useState([]);
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
      setItems(combined);
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const toggleHelped = (id, e) => {
    e.stopPropagation();
    setHelpedMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="community-page-main">
        <div className="container-reading">
          
          <header className="community-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">The Collective</span>
            </div>
            <h1 className="community-title">Shared reflections.</h1>
            <p className="community-subtext">
              Real student experiences without follower counts, clout, or endless scrolling. Just quiet solidarity.
            </p>
          </header>

          {loading ? (
            <div className="state-screen" style={{ minHeight: '200px' }}>
              <p className="state-subtext">Loading reflections from sanctuary...</p>
            </div>
          ) : (
            <div className="community-stream">
              {items.map((item) => {
                const isHelped = !!helpedMap[item.id];
                const currentCount = item.helpfulCount + (isHelped ? 1 : 0);

                return (
                  <article 
                    key={item.id} 
                    className="community-entry-card"
                    onClick={() => navigate(`/experience/${item.id}`)}
                  >
                    <div className="community-card-meta">
                      <span className="anon-author">{item.author}</span>
                      <span className="meta-sep">·</span>
                      <span className="anon-major">{item.context}</span>
                      <span className="meta-sep">·</span>
                      <span className="anon-time">{item.timeAgo}</span>
                    </div>

                    <blockquote className="community-quote">
                      “{item.excerpt}”
                    </blockquote>

                    {item.whatHappened && (
                      <p className="community-excerpt-text">
                        {item.whatHappened.slice(0, 160)}…
                      </p>
                    )}

                    <div className="community-card-footer">
                      <button
                        type="button"
                        className={`btn-community-helped ${isHelped ? 'helped-marked' : ''}`}
                        onClick={(e) => toggleHelped(item.id, e)}
                      >
                        <span className="helped-heart">{isHelped ? '✓' : '🤍'}</span>
                        <span>{isHelped ? 'Marked as helpful' : 'This helped me'}</span>
                        <span className="helped-count-pill">{currentCount}</span>
                      </button>

                      <button
                        type="button"
                        className="community-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/experience/${item.id}`);
                        }}
                      >
                        <span>Read reflection</span>
                        <span className="arrow" aria-hidden="true">→</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="community-ethics-box">
            <h4 className="ethics-title">A non-extractive social space</h4>
            <p className="ethics-body">
              BeenThere has no like competitions, no comment arguments, and no push notifications designed to hook your attention. When you have found what you need, close the tab and return to your evening.
            </p>
          </div>

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
