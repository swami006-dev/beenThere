import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';
import { mapPostToUI } from '../utils/dataMappers';

export function MyPostsPage() {
  const { navigate } = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');

  const fetchPosts = () => {
    setLoading(true);
    setError(null);
    api.get('/posts/mine')
      .then(res => {
        const raw = Array.isArray(res) ? res : [];
        setPosts(raw.map(mapPostToUI));
        setLoading(false);
      })
      .catch(err => {
        console.warn('api.get(/posts/mine) error, attempting fallback:', err.message);
        api.get('/posts?mine=true')
          .then(res => {
            const raw = Array.isArray(res) ? res : [];
            setPosts(raw.map(mapPostToUI));
            setLoading(false);
          })
          .catch(fallbackErr => {
            console.error('Failed to load my posts:', fallbackErr);
            setError('Could not load your posts from sanctuary.');
            setLoading(false);
          });
      });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this reflection? Once deleted, it will no longer be visible to students.')) {
      return;
    }

    try {
      await api.delete(`/posts/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert(err.message || 'Failed to delete post');
    }
  };

  const handleStartEdit = (post) => {
    setEditingPost(post);
    setEditContent(post.content || post.excerpt || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost || !editContent.trim()) return;

    try {
      const updated = await api.patch(`/posts/${editingPost.id}`, {
        content: editContent.trim()
      });

      setPosts(prev => prev.map(p => p.id === editingPost.id ? mapPostToUI(updated) : p));
      setEditingPost(null);
    } catch (err) {
      console.error('Failed to update post:', err);
      alert(err.message || 'Failed to update post');
    }
  };

  const filteredPosts = filterStatus === 'all' 
    ? posts 
    : posts.filter(p => (p.status || 'approved') === filterStatus);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'published':
        return <span className="status-pill published">● Published</span>;
      case 'pending':
      case 'under_review':
        return <span className="status-pill reviewing">◐ Under review</span>;
      case 'flagged':
        return <span className="status-pill flagged">▲ Needs attention</span>;
      case 'removed':
        return <span className="status-pill removed">○ Removed</span>;
      default:
        return <span className="status-pill">{status}</span>;
    }
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="my-posts-main">
        <div className="container-reading">
          
          <header className="my-posts-header">
            <div className="section-label">
              <span className="label-index">01</span>
              <span className="label-text">Personal Archive</span>
            </div>
            <div className="header-flex-row">
              <div>
                <h1 className="my-posts-title">Your experiences.</h1>
                <p className="my-posts-subtext">
                  Reflections you have anonymously offered to other students. You retain complete control over your words.
                </p>
              </div>

              <button 
                type="button" 
                className="btn-new-post"
                onClick={() => navigate('/share')}
              >
                + Share new reflection
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="status-filter-pills" role="tablist">
              {['all', 'approved', 'pending'].map(status => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  className={`status-tab-btn ${filterStatus === status ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'all' ? `All (${posts.length})` :
                   status === 'approved' ? 'Approved / Published' : 'Under review'}
                </button>
              ))}
            </div>
          </header>

          {loading ? (
            <div className="state-screen" style={{ minHeight: '200px' }}>
              <p className="state-subtext">Loading your reflections from sanctuary...</p>
            </div>
          ) : error ? (
            <div className="auth-error-banner" style={{ margin: '30px 0' }}>
              <span>{error}</span>
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="my-posts-list">
              {filteredPosts.map((post) => (
                <article key={post.id} className="my-post-card">
                  <div className="post-card-meta">
                    <div className="meta-left">
                      {getStatusBadge(post.status)}
                      <span className="post-category">{post.categoryLabel}</span>
                      <span className="post-meta-dot">·</span>
                      <span className="post-time">{post.timeAgo}</span>
                    </div>

                    <div className="meta-right">
                      <span className="helped-stat">
                        🤍 {post.helpfulCount} students helped
                      </span>
                    </div>
                  </div>

                  <blockquote className="post-excerpt-quote">
                    “{post.content}”
                  </blockquote>

                  <div className="post-card-actions">
                    <button 
                      type="button" 
                      className="post-action-btn"
                      onClick={() => navigate(`/post/${post.id}`, { from: '/my-experiences' })}
                    >
                      View in sanctuary
                    </button>

                    <button 
                      type="button" 
                      className="post-action-btn"
                      onClick={() => handleStartEdit(post)}
                    >
                      Edit reflection
                    </button>

                    <button 
                      type="button" 
                      className="post-action-btn danger"
                      onClick={() => handleDelete(post.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="empty-state-card">
              <div className="empty-state-icon">✍️</div>
              <h3 className="empty-state-title">You haven't shared an experience yet.</h3>
              <p className="empty-state-subtext">
                Your voice could be the exact reassurance another student needs at 2:00 AM.
              </p>
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

      {/* Edit Modal */}
      {editingPost && (
        <div className="modal-backdrop" onClick={() => setEditingPost(null)} role="dialog" aria-modal="true">
          <div className="modal-sheet composer-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <span className="crumb-badge">Edit Reflection</span>
              <button type="button" className="modal-close-btn" onClick={() => setEditingPost(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-scroll-area">
              <h2 className="composer-heading">Update your reflection</h2>
              <p className="composer-subtext">Edits are saved directly to your anonymous profile.</p>

              <div className="form-field-group">
                <label className="form-label">Full reflection text</label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                />
              </div>

              <div className="composer-footer">
                <button type="button" className="btn-cancel" onClick={() => setEditingPost(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-post">
                  Save updates →
                </button>
              </div>
            </form>
          </div>
        </div>
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
