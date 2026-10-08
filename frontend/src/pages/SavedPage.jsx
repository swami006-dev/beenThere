import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';

export function SavedPage() {
  const { navigate } = useRouter();
  const { currentUser, toggleSaveExperience } = useAuth();

  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.get('/saved')
      .then(res => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : [];
        setSavedItems(list);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn('SavedPage fetch notice:', err.message);
        setSavedItems([]);
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentUser?.internalId]);

  const handleRemove = async (itemId, itemType, e) => {
    e.stopPropagation();
    setSavedItems(prev => prev.filter(item => (item.itemId || item.item_id) !== itemId));
    await toggleSaveExperience(itemId, itemType);
  };

  const handleOpenItem = (item) => {
    const targetId = item.itemId || item.item_id || item.id;
    const isPost = (item.itemType || item.item_type) === 'post';
    if (isPost) {
      navigate(`/post/${targetId}`, { from: '/saved' });
    } else {
      navigate(`/experience/${targetId}`, { from: '/saved' });
    }
  };

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
          ) : savedItems.length > 0 ? (
            <div className="saved-list">
              {savedItems.map((item) => {
                const targetId = item.itemId || item.item_id || item.id;
                const isPost = (item.itemType || item.item_type) === 'post';
                const category = item.category || 'General';
                const title = item.title || 'Student Reflection';
                const excerpt = item.metadata?.content || item.metadata?.excerpt || item.title || '';
                const author = item.metadata?.author || (isPost ? 'Anonymous Student' : 'Curated Guidance');
                const readTime = item.metadata?.readTime || '3 min read';
                const timeAgo = item.timeAgo || 'Saved';

                return (
                  <article key={item.id || targetId} className="saved-experience-card" onClick={() => handleOpenItem(item)}>
                    <div className="saved-card-meta">
                      <span className="entry-category-badge">{category}</span>
                      <span className="entry-read-time">{readTime}</span>
                    </div>

                    <blockquote className="saved-card-quote">
                      "{title}"
                    </blockquote>

                    {excerpt && excerpt !== title && (
                      <p className="saved-card-snippet">
                        {excerpt.slice(0, 140)}…
                      </p>
                    )}

                    <div className="saved-card-footer">
                      <div className="entry-meta">
                        <span className="meta-author">{author}</span>
                        <span className="meta-dot">·</span>
                        <span className="meta-context">{isPost ? 'Student Reflection' : 'Curated Guidance'}</span>
                        <span className="meta-dot">·</span>
                        <span className="meta-time">{timeAgo}</span>
                      </div>

                      <div className="saved-card-actions">
                        <button
                          type="button"
                          className="entry-read-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenItem(item);
                          }}
                        >
                          <span>{isPost ? 'Read reflection' : 'Read guidance'}</span>
                          <span className="arrow" aria-hidden="true">→</span>
                        </button>
                        <button
                          type="button"
                          className="btn-unsave"
                          onClick={(e) => handleRemove(targetId, item.itemType || item.item_type || 'post', e)}
                          title="Remove from saved"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
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
