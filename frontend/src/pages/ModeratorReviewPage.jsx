import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { INITIAL_MODERATION_QUEUE } from '../data/mockDatabase';

export function ModeratorReviewPage() {
  const { match, navigate } = useRouter();
  const { isAuthenticated, currentUser, loadingSession } = useAuth();
  const id = match.params.id;

  const report = INITIAL_MODERATION_QUEUE.find(r => r.id === id) || INITIAL_MODERATION_QUEUE[0];
  const [currentStatus, setCurrentStatus] = useState(report.status);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  if (loadingSession) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="mod-review-main">
          <div className="container-reading state-screen" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="state-subtext">Verifying permissions…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated || currentUser?.role !== 'moderator') {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="mod-review-main">
          <div className="container-reading" style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h1 className="auth-title" style={{ marginBottom: '12px', fontSize: '1.8rem' }}>Moderator access required</h1>
            <p className="auth-subtext" style={{ marginBottom: '32px' }}>
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

  const handleResolve = (actionType) => {
    setCurrentStatus(actionType);
    setFeedbackNotice(`Action completed: Reflection marked as ${actionType}.`);
    setTimeout(() => {
      navigate('/moderator');
    }, 1200);
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="mod-review-main">
        <div className="container-reading">
          
          <div className="review-top-bar">
            <button 
              type="button" 
              className="back-nav-btn"
              onClick={() => navigate('/moderator')}
            >
              ← Back to moderation queue
            </button>
            <span className={`urgency-badge ${report.urgency}`}>
              {report.urgency.toUpperCase()} URGENCY
            </span>
          </div>

          <header className="review-header">
            <div className="section-label">
              <span className="label-index">CASE</span>
              <span className="label-text">#{report.id}</span>
            </div>
            <h1 className="review-title">Reviewing flagged reflection.</h1>
            <p className="review-subtext">
              Evaluate whether this contribution upholds the BeenThere sanctuary principles.
            </p>
          </header>

          {feedbackNotice && (
            <div className="mod-notice-banner" role="status">
              <span>{feedbackNotice}</span>
            </div>
          )}

          {/* Incident Overview Card */}
          <div className="incident-card">
            <div className="incident-grid">
              <div className="incident-item">
                <span className="incident-item-label">Flagged Reason</span>
                <span className="incident-item-val">{report.reason}</span>
              </div>
              <div className="incident-item">
                <span className="incident-item-label">Reported By</span>
                <span className="incident-item-val">{report.reporter}</span>
              </div>
              <div className="incident-item">
                <span className="incident-item-label">Timestamp</span>
                <span className="incident-item-val">{report.reportedAt}</span>
              </div>
              <div className="incident-item">
                <span className="incident-item-label">Author Mask</span>
                <span className="incident-item-val">{report.authorContext}</span>
              </div>
            </div>

            <div className="incident-details-box">
              <span className="details-box-label">Sentinel Assessment Notes:</span>
              <p className="details-box-text">{report.flagDetails}</p>
            </div>
          </div>

          {/* Full Content Under Review */}
          <div className="content-under-review-card">
            <h3 className="curated-heading">Full Submission Content</h3>
            <div className="full-text-inspection">
              <p>{report.fullContent}</p>
            </div>
          </div>

          {/* Moderator Notes */}
          <div className="moderator-notes-form">
            <label htmlFor="mod-notes" className="notes-label">
              Confidential internal notes (optional)
            </label>
            <textarea
              id="mod-notes"
              className="notes-textarea"
              rows={3}
              placeholder="e.g. Redacted student names, or escalated to student affairs wellness line."
              value={moderatorNotes}
              onChange={(e) => setModeratorNotes(e.target.value)}
            />
          </div>

          {/* Triage Decision Buttons */}
          <div className="decision-actions-panel">
            <h4 className="decision-title">Determine Triage Action:</h4>
            
            <div className="decision-buttons-row">
              <button 
                type="button" 
                className="btn-decision approve"
                onClick={() => handleResolve('approved')}
              >
                <strong>Approve & Restore</strong>
                <span>Complies with sanctuary care rules</span>
              </button>

              <button 
                type="button" 
                className="btn-decision remove"
                onClick={() => handleResolve('removed')}
              >
                <strong>Remove permanently</strong>
                <span>Violates privacy or safety guidelines</span>
              </button>

              <button 
                type="button" 
                className="btn-decision escalate"
                onClick={() => handleResolve('escalated')}
              >
                <strong>Escalate to Counselor</strong>
                <span>Urgent psychological crisis intervention</span>
              </button>
            </div>
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
