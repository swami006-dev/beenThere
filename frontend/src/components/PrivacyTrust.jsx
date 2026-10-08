import React from 'react';

const TRUST_POINTS = [
  {
    title: "Your real identity isn't shown to other students.",
    description: "Your anonymous display name is what others see. Private conversations remain anonymous. No real names or emails are ever exposed."
  },
  {
    title: "You control what you share.",
    description: "Write as little or as much as feels right. You can read without sharing anything, or save a draft without ever publishing it."
  },
  {
    title: "You can report experiences that feel unsafe.",
    description: "Every reflection includes a one-click quiet review trigger. Any content violating community care guidelines is flagged immediately."
  },
  {
    title: "Anonymous does not mean unmoderated.",
    description: "Our community standards protect students from bullying, harassment, and harmful advice. Anonymity is a shield for vulnerability, not cruelty."
  }
];

export function PrivacyTrust() {
  return (
    <section className="privacy-section" id="privacy">
      <div className="container">
        
        <div className="privacy-inner-card">
          <header className="privacy-header">
            <div className="section-label">
              <span className="label-index">05</span>
              <span className="label-text">Trust & Safety</span>
            </div>
            <h2 className="privacy-title">Share only what you’re comfortable sharing.</h2>
            <p className="privacy-subtitle">
              We built BeenThere as a quiet sanctuary. Here is how your boundaries are preserved.
            </p>
          </header>

          <div className="trust-points-grid">
            {TRUST_POINTS.map((point, index) => (
              <div key={index} className="trust-point-card">
                <div className="trust-point-header">
                  <span className="trust-bullet-marker" aria-hidden="true" />
                  <h3 className="trust-point-title">{point.title}</h3>
                </div>
                <p className="trust-point-description">{point.description}</p>
              </div>
            ))}
          </div>

          {/* Compact Safety AI Row */}
          <div style={{
            marginTop: '24px',
            marginBottom: '20px',
            padding: '16px 20px',
            backgroundColor: 'var(--surface-subtle, #14171D)',
            border: '1px solid var(--border, #292D35)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                🛡️ AI-Assisted Safety & Human Moderation
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                AI helps flag serious safety concerns. Human moderators make the final decision.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', padding: '3px 8px', background: 'var(--surface-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                🔒 Anonymous identity
              </span>
              <span style={{ fontSize: '0.74rem', padding: '3px 8px', background: 'var(--surface-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                🤖 AI-assisted safety
              </span>
              <span style={{ fontSize: '0.74rem', padding: '3px 8px', background: 'var(--surface-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                👤 Human review
              </span>
              <span style={{ fontSize: '0.74rem', padding: '3px 8px', background: 'var(--surface-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                🚫 No diagnosis
              </span>
            </div>
          </div>

          <div className="privacy-pledge-footer">
            <p className="privacy-pledge-text">
              We do not sell student data, track you across the internet, or require social media logins.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
