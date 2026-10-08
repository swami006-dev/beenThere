import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { api } from '../config/api';

export function ModeratorPage() {
  const { navigate } = useRouter();
  const { isAuthenticated, currentUser, loadingSession } = useAuth();

  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionNotice, setActionNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (loadingSession) return;
    if (!isAuthenticated || currentUser?.role !== 'moderator') {
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      api.get('/moderation/reports').catch(() => []),
      api.get('/posts').catch(() => []),
      api.get('/experiences').catch(() => [])
    ]).then(([reportsRes, postsRes, expRes]) => {
      if (!isMounted) return;
      setReports(Array.isArray(reportsRes) ? reportsRes : []);
      setPosts(Array.isArray(postsRes) ? postsRes : []);
      setExperiences(Array.isArray(expRes) ? expRes : []);
      setLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      console.error('Failed to load moderation desk data:', err);
      setError('Failed to access moderation desk. Moderator role required.');
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [loadingSession, isAuthenticated, currentUser]);

  if (loadingSession) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="moderator-page-main">
          <div className="container state-screen" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="state-subtext">Verifying permissions…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Protection check for students and unauthenticated users
  if (!isAuthenticated || currentUser?.role !== 'moderator') {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="moderator-page-main">
          <div className="container" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '540px', margin: '0 auto' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h1 className="auth-title" style={{ marginBottom: '12px', fontSize: '1.8rem' }}>Moderator access required</h1>
            <p className="auth-subtext" style={{ marginBottom: '32px', color: 'var(--text-secondary)' }}>
              This section is restricted to community moderators. Student accounts do not have access to moderation controls.
            </p>
            <button 
              type="button" 
              className="btn-auth-primary"
              style={{ padding: '12px 24px', width: 'auto', margin: '0 auto' }}
              onClick={() => navigate('/home')}
            >
              Return to Home →
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Action: Hide / Archive reported content
  const handleHideArchive = async (reportId, targetType, targetId) => {
    try {
      if (targetType === 'response') {
        await api.patch(`/moderation/responses/${targetId}`, { status: 'hidden' });
      } else {
        await api.patch(`/moderation/posts/${targetId}`, { status: 'hidden' });
      }

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'archived' } : r));
      setActionNotice(`Content target #${targetId} hidden & archived from sanctuary.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Hide action failed:', err);
      setActionNotice(`Action failed: ${err.message}`);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  // Action: Promote useful discussion to Experience Card in Approved Library
  const handlePromoteToExperience = async (reportId, postId) => {
    try {
      const res = await api.post(`/moderation/posts/${postId}/promote`);
      if (reportId) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'approved' } : r));
      }
      setActionNotice(`Post #${postId} promoted to Experience Card in Approved Library!`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Promotion action failed:', err);
      setActionNotice(`Promotion failed: ${err.message}`);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const filteredReports = activeTab === 'all' 
    ? reports 
    : reports.filter(r => (r.status || 'pending') === activeTab);

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="moderator-page-main">
        <div className="container">
          
          <header className="moderator-header">
            <div className="section-label">
              <span className="label-index">MOD</span>
              <span className="label-text">Sanctuary Sentinel</span>
            </div>
            <div className="mod-header-row">
              <div>
                <h1 className="moderator-title">Community Care & Moderation Desk.</h1>
                <p className="moderator-subtext">
                  Review reported content to hide or archive violations, and curate useful student discussions into approved Experience Cards.
                </p>
              </div>

              <div className="mod-stats-summary">
                <div className="mod-stat-pill">
                  <span>{reports.filter(r => (r.status || 'pending') === 'pending').length} Pending reports</span>
                </div>
              </div>
            </div>

            {/* Moderation Workflow Visual Banner */}
            <div className="mod-flow-banner" aria-label="Moderation Workflow Flowchart">
              <div className="mod-flow-branch">
                <span className="mod-flow-step">Reported / Flagged Content</span>
                <span className="mod-flow-arrow">→</span>
                <span className="mod-flow-step">Moderator</span>
                <span className="mod-flow-arrow">→</span>
                <span className="mod-flow-step action-hide">Hide / Archive</span>
              </div>

              <div className="mod-flow-branch">
                <span className="mod-flow-step">Useful Discussion</span>
                <span className="mod-flow-arrow">→</span>
                <span className="mod-flow-step">Moderator</span>
                <span className="mod-flow-arrow">→</span>
                <span className="mod-flow-step action-promote">Experience Card</span>
                <span className="mod-flow-arrow">→</span>
                <span className="mod-flow-step action-promote">Approved Library</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mod-tabs-bar" role="tablist">
              {[
                { id: 'pending', label: `Pending Reports (${reports.filter(r => (r.status || 'pending') === 'pending').length})` },
                { id: 'all', label: `All Reports (${reports.length})` },
                { id: 'discussions', label: `Community Discussions (${posts.length})` },
                { id: 'library', label: `Approved Library (${experiences.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`mod-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          {actionNotice && (
            <div className="mod-notice-banner" role="status">
              <span>{actionNotice}</span>
            </div>
          )}

          {loading ? (
            <div className="state-screen" style={{ minHeight: '200px' }}>
              <p className="state-subtext">Fetching community care queue...</p>
            </div>
          ) : error ? (
            <div className="auth-error-banner" style={{ margin: '30px 0' }}>
              <span>{error}</span>
            </div>
          ) : activeTab === 'discussions' ? (
            /* Useful Discussions / Community Posts View */
            <div className="moderation-queue-list">
              {posts.length > 0 ? posts.map((post) => (
                <article key={post.id} className="mod-card">
                  <div className="mod-card-header">
                    <div className="mod-meta-tags">
                      <span className="urgency-badge medium">POST</span>
                      <span className="mod-reporter-tag">Category: {post.category}</span>
                      <span className="mod-meta-sep">·</span>
                      <span className="mod-time">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                    <span className={`status-pill ${post.status || 'approved'}`}>
                      Status: {post.status || 'approved'}
                    </span>
                  </div>

                  <div className="mod-reason-box" style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    “{post.content}”
                  </div>

                  <div className="mod-actions-toolbar">
                    <div className="mod-quick-actions">
                      <button 
                        type="button" 
                        className="btn-mod-quick promote"
                        onClick={() => handlePromoteToExperience(null, post.id)}
                      >
                        ✦ Promote to Experience Card (Approved Library)
                      </button>

                      <button 
                        type="button" 
                        className="btn-mod-quick remove"
                        onClick={() => handleHideArchive(null, 'post', post.id)}
                      >
                        ✕ Hide / Archive
                      </button>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="empty-state-card">
                  <h3 className="empty-state-title">No posts in community feed.</h3>
                </div>
              )}
            </div>
          ) : activeTab === 'library' ? (
            /* Approved Experience Library View */
            <div className="moderation-queue-list">
              {experiences.length > 0 ? experiences.map((exp) => (
                <article key={exp.id} className="mod-card">
                  <div className="mod-card-header">
                    <div className="mod-meta-tags">
                      <span className="urgency-badge low">APPROVED EXPERIENCE CARD</span>
                      <span className="mod-reporter-tag">{exp.category}</span>
                    </div>
                    <span className="status-pill approved">Approved Library</span>
                  </div>
                  <blockquote style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: '8px 0' }}>
                    “{exp.excerpt || exp.title}”
                  </blockquote>
                </article>
              )) : (
                <div className="empty-state-card">
                  <h3 className="empty-state-title">No approved experience cards yet.</h3>
                </div>
              )}
            </div>
          ) : filteredReports.length > 0 ? (
            /* Reported / Flagged Content Queue */
            <div className="moderation-queue-list">
              {filteredReports.map((item) => (
                <article key={item.id} className="mod-card">
                  <div className="mod-card-header">
                    <div className="mod-meta-tags">
                      <span className="urgency-badge medium">
                        {item.targetType ? item.targetType.toUpperCase() : 'POST'}
                      </span>
                      <span className="mod-reporter-tag">Target ID: {item.targetId}</span>
                      <span className="mod-meta-sep">·</span>
                      <span className="mod-time">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}</span>
                    </div>

                    <span className={`status-pill ${item.status || 'pending'}`}>
                      Status: {item.status || 'pending'}
                    </span>
                  </div>

                  <div className="mod-reason-box">
                    <strong>Flag reason:</strong> {item.reason}
                  </div>

                  <div className="mod-actions-toolbar">
                    <div className="mod-quick-actions">
                      <button 
                        type="button" 
                        className="btn-mod-quick remove"
                        onClick={() => handleHideArchive(item.id, item.targetType, item.targetId)}
                      >
                        ✕ Hide / Archive
                      </button>

                      <button 
                        type="button" 
                        className="btn-mod-quick promote"
                        onClick={() => handlePromoteToExperience(item.id, item.targetId)}
                      >
                        ✦ Promote to Experience Card → Approved Library
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <div className="empty-state-icon">🛡</div>
              <h3 className="empty-state-title">No reports in this view.</h3>
              <p className="empty-state-subtext">The student sanctuary is quiet and operating safely.</p>
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
