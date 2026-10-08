import React from 'react';

export function Footer({ onScrollTop, onExploreClick, onPrivacyClick, onHowItWorksClick }) {
  return (
    <footer className="footer-wrap">
      <div className="container">
        
        {/* Urgent Crisis Notice Box (Responsible Peer Platform Standard) */}
        <div className="crisis-banner">
          <div className="crisis-indicator" aria-hidden="true">
            <span className="crisis-dot" />
          </div>
          <div className="crisis-text">
            <strong>Immediate Help Notice:</strong> BeenThere is an anonymous peer-to-peer reflection space, not a medical or clinical crisis service. If you are experiencing acute danger, self-harm thoughts, or emergency distress, please reach out to professional counselors immediately: 
            <span className="crisis-numbers"> Call or text <strong>988</strong> (US/Canada), or text <strong>HOME</strong> to <strong>741741</strong>. In the UK, call <strong>111</strong>. Free, confidential, 24/7.</span>
          </div>
        </div>

        {/* Minimal Footer Main Row */}
        <div className="footer-main-row">
          <div className="footer-brand-col">
            <div className="footer-logo">BEENTHERE</div>
            <p className="footer-tagline">
              You’re not the first to feel this way.
            </p>
          </div>

          <div className="footer-nav-col">
            <button type="button" className="footer-link" onClick={onExploreClick}>
              Explore
            </button>
            <button type="button" className="footer-link" onClick={onHowItWorksClick}>
              How it works
            </button>
            <button type="button" className="footer-link" onClick={onPrivacyClick}>
              Privacy & trust
            </button>
            <button type="button" className="footer-link" onClick={onScrollTop}>
              Back to top ↑
            </button>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-row">
          <span className="footer-copyright">
            © {new Date().getFullYear()} BeenThere. An anonymous peer sanctuary for students everywhere.
          </span>
          <span className="footer-principles">
            Your real identity is never exposed to other students.
          </span>
        </div>

      </div>
    </footer>
  );
}
