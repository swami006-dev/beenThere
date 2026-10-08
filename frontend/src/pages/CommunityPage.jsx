import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';
import { mapPostToUI } from '../utils/dataMappers';

export function CommunityPage() {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'recent', 'most-discussed'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reactionsMap, setReactionsMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.get('/posts')
      .then(postsRes => {
        if (!isMounted) return;
        const rawPosts = Array.isArray(postsRes) ? postsRes : [];
        const mapped = rawPosts.map(mapPostToUI);
        setPosts(mapped);
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setPosts([]);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  const toggleReaction = async (postId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(`/login?redirect=/community`);
      return;
    }

    try {
      const res = await api.post(`/reactions/${postId}`);
      if (res && typeof res.count === 'number') {
        setReactionsMap(prev => ({
          ...prev,
          [postId]: {
            count: res.count,
            userReacted: !!res.userReacted
          }
        }));
      }
    } catch (err) {
      console.warn('Reaction error:', err.message);
    }
  };

  // Filter and sort discussions
  let filteredPosts = [...posts];
  if (activeTab === 'recent') {
    filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (activeTab === 'most-discussed') {
    filteredPosts.sort((a, b) => (b.responseCount || 0) - (a.responseCount || 0));
  }

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="community-page-main">
        <div className="container-reading">
          
          <header className="community-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">Talk With Students</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h1 className="community-title" style={{ margin: '0 0 8px' }}>
                  Student Discussions.
                </h1>
                <p className="community-subtext" style={{ margin: 0, maxWidth: '580px' }}>
                  Talk with students who've been there. Ask questions, explore experiences, and join honest peer conversations.
                </p>
              </div>

              <button
                type="button"
                className="btn-auth-primary"
                onClick={() => navigate('/share')}
                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>+ Start a discussion</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="status-filter-pills" role="tablist" style={{ marginTop: '20px' }}>
              <button
                type="button"
                role="tab"
                className={`status-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All discussions ({posts.length})
              </button>
              <button
                type="button"
                role="tab"
                className={`status-tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
                onClick={() => setActiveTab('recent')}
              >
                Recent discussions
              </button>
              <button
                type="button"
                role="tab"
                className={`status-tab-btn ${activeTab === 'most-discussed' ? 'active' : ''}`}
                onClick={() => setActiveTab('most-discussed')}
              >
                Most discussed
              </button>
            </div>
          </header>

          {loading ? (
            <div className="state-screen" style={{ minHeight: '200px' }}>
              <p className="state-subtext">Loading discussions from sanctuary...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{
              padding: '36px 20px',
              backgroundColor: 'var(--surface-primary)',
              border: '1px dashed var(--border)',
              borderRadius: '8px',
              textAlign: 'center',
              margin: '28px 0'
            }}>
              <p style={{ fontStyle: 'italic', fontSize: '0.94rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                No student discussions yet. Start a discussion to open the conversation for others.
              </p>
              <button
                type="button"
                className="btn-auth-primary"
                style={{ width: 'auto', padding: '10px 20px', margin: '0 auto', fontSize: '0.88rem' }}
                onClick={() => navigate('/share')}
              >
                Start a discussion →
              </button>
            </div>
          ) : (
            <div className="community-stream" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              {filteredPosts.map((post) => {
                const rxn = reactionsMap[post.id];
                const isReacted = rxn ? rxn.userReacted : false;
                const reactionCount = rxn ? rxn.count : 0;
                const responseCount = post.responseCount || 0;

                return (
                  <article 
                    key={post.id} 
                    className="community-entry-card"
                    style={{
                      backgroundColor: 'var(--surface-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '22px 24px',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/post/${post.id}`, { from: '/community' })}
                  >
                    <div className="community-card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem' }}>{post.anonymousAvatar || '🦉'}</span>
                        <span className="anon-author" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {post.author} · Student
                        </span>
                        <span className="meta-sep" style={{ color: 'var(--text-tertiary)' }}>·</span>
                        <span className="anon-time" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                          {post.timeAgo}
                        </span>

                        {post.anonymousProfileId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/anonymous/${post.anonymousProfileId}`, { from: '/community' });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-mint)',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              padding: '0 4px',
                              textDecoration: 'underline'
                            }}
                          >
                            View profile
                          </button>
                        )}
                      </div>

                      <span style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-tertiary)',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {post.categoryLabel}
                      </span>
                    </div>

                    <blockquote className="community-quote" style={{ margin: '12px 0 16px', fontSize: '1.02rem', lineHeight: '1.55', color: 'var(--text-primary)' }}>
                      “{post.content}”
                    </blockquote>

                    <div className="community-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{
                          fontSize: '0.84rem',
                          color: 'var(--accent-mint)',
                          backgroundColor: 'rgba(123, 224, 179, 0.08)',
                          border: '1px solid var(--accent-mint-border)',
                          borderRadius: '12px',
                          padding: '3px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 500
                        }}>
                          💬 {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                        </span>

                        <button
                          type="button"
                          className={`btn-community-helped ${isReacted ? 'helped-marked' : ''}`}
                          onClick={(e) => toggleReaction(post.id, e)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            color: isReacted ? 'var(--accent-mint)' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <span>{isReacted ? '✓' : '🤍'}</span>
                          <span>{isReacted ? 'Helpful' : 'This helped me'}</span>
                          {reactionCount > 0 && <span style={{ opacity: 0.8 }}>({reactionCount})</span>}
                        </button>
                      </div>

                      <button
                        type="button"
                        className="community-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/post/${post.id}`, { from: '/community' });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-mint)',
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>Join discussion</span>
                        <span className="arrow" aria-hidden="true">→</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="community-ethics-box" style={{ marginTop: '40px' }}>
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
