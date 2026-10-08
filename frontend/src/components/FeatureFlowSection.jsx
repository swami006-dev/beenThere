import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { api } from '../config/api';

/**
 * Consolidated Feature Flow Section for BeenThere Landing Page.
 * Renders ONE cohesive vertical step chain:
 * 01 UNDERSTAND -> 02 FIND -> 03 TALK PRIVATELY -> 04 IF NOBODY MATCHES
 */
export function FeatureFlowSection({ onOpenStory }) {
  const { navigate } = useRouter();
  const [featuredCard, setFeaturedCard] = useState(null);

  // Load MAXIMUM 1 real Experience Card from backend API
  useEffect(() => {
    let isMounted = true;
    api.get('/experiences')
      .then(res => {
        if (!isMounted) return;
        if (Array.isArray(res) && res.length > 0) {
          setFeaturedCard(res[0]);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFeaturedCard({
            id: 'seed-exp-1',
            title: 'Overcoming Coding Exam Paralysis',
            category: 'Academic',
            author: 'Anonymous Moon',
            context: 'CS Student',
            excerpt: 'I used to freeze during coding tests even though I knew the concepts.',
            whatHelped: ['Practicing with a timer', 'Solving smaller problems first']
          });
        }
      });

    return () => { isMounted = false; };
  }, []);

  return (
    <section className="feature-flow-section" id="how-it-works" style={{
      padding: '72px 0',
      backgroundColor: 'var(--bg, #090A0C)',
      borderTop: '1px solid var(--border, #292D35)'
    }}>
      <div className="container-reading">

        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            backgroundColor: 'var(--surface-primary, #111318)',
            border: '1px solid var(--accent-mint-border, rgba(123, 224, 179, 0.2))',
            borderRadius: '20px',
            fontSize: '0.76rem',
            color: 'var(--accent-mint, #7BE0B3)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '14px'
          }}>
            <span>✨ HOW BEENTHERE CONNECTS PEOPLE</span>
          </div>

          <h2 style={{
            fontSize: '1.85rem',
            fontWeight: 500,
            color: 'var(--text-primary, #F4F4F0)',
            margin: '0 0 10px 0',
            lineHeight: '1.3'
          }}>
            AI helps you find the human experience that feels closest to yours.
          </h2>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* ONE CONNECTED VERTICAL PRODUCT JOURNEY */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* STEP 1: 🧠 01 — UNDERSTAND */}
          <div style={{
            width: '100%',
            backgroundColor: 'var(--surface-primary, #111318)',
            border: '1px solid var(--border, #292D35)',
            borderRadius: '10px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🧠</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-mint, #7BE0B3)', letterSpacing: '0.05em' }}>
                01 — UNDERSTAND
              </span>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #9297A1)', margin: '0 0 14px 0', lineHeight: '1.5' }}>
              You explain what's going on in your own words. BeenThere identifies:
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', padding: '4px 12px', background: 'var(--surface-subtle)', border: '1px solid var(--accent-mint-border)', borderRadius: '4px', color: 'var(--accent-mint)', fontWeight: 500 }}>
                Academic
              </span>
              <span style={{ fontSize: '0.78rem', padding: '4px 12px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                Exam anxiety
              </span>
              <span style={{ fontSize: '0.78rem', padding: '4px 12px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                Performance pressure
              </span>
            </div>
          </div>

          {/* VERTICAL CONNECTOR */}
          <div style={{ height: '32px', width: '2px', backgroundColor: 'var(--accent-mint-border)', margin: '4px 0', position: 'relative' }}>
            <span style={{ position: 'absolute', bottom: '-8px', left: '-4px', fontSize: '0.7rem', color: 'var(--accent-mint)' }}>↓</span>
          </div>

          {/* STEP 2: 🤝 02 — FIND SOMEONE WHO'S BEEN THERE */}
          <div style={{
            width: '100%',
            backgroundColor: 'var(--surface-primary, #111318)',
            border: '1px solid var(--border, #292D35)',
            borderRadius: '10px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🤝</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-mint, #7BE0B3)', letterSpacing: '0.05em' }}>
                02 — FIND SOMEONE WHO'S BEEN THERE
              </span>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #9297A1)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Instead of generating generic advice, BeenThere searches real student experiences that are semantically similar to yours.
            </p>

            {/* MAXIMUM 1 COMPACT EXPERIENCE CARD */}
            {featuredCard ? (
              <div style={{
                backgroundColor: 'var(--surface-subtle, #14171D)',
                border: '1px solid var(--border, #292D35)',
                borderRadius: '8px',
                padding: '16px 18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {featuredCard.author || featuredCard.anonymousDisplayName || 'Anonymous Moon'} · {featuredCard.context || 'CS Student'}
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(123, 224, 179, 0.1)', border: '1px solid var(--accent-mint-border)', borderRadius: '4px', color: 'var(--accent-mint)' }}>
                    {featuredCard.category || 'Academic'}
                  </span>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: '0 0 12px 0' }}>
                  “{featuredCard.excerpt || featuredCard.whatHappened || 'I used to freeze during coding tests even though I knew the concepts.'}”
                </p>
                <button
                  type="button"
                  className="btn-read-another"
                  style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                  onClick={() => {
                    if (onOpenStory) onOpenStory(featuredCard.id);
                    else navigate(`/experience/${featuredCard.id}`);
                  }}
                >
                  Read experience →
                </button>
              </div>
            ) : null}
          </div>

          {/* VERTICAL CONNECTOR */}
          <div style={{ height: '32px', width: '2px', backgroundColor: 'var(--accent-mint-border)', margin: '4px 0', position: 'relative' }}>
            <span style={{ position: 'absolute', bottom: '-8px', left: '-4px', fontSize: '0.7rem', color: 'var(--accent-mint)' }}>↓</span>
          </div>

          {/* STEP 3: 💬 03 — TALK PRIVATELY */}
          <div style={{
            width: '100%',
            backgroundColor: 'var(--surface-primary, #111318)',
            border: '1px solid var(--accent-mint-border, rgba(123, 224, 179, 0.2))',
            borderRadius: '10px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>💬</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-mint, #7BE0B3)', letterSpacing: '0.05em' }}>
                03 — TALK PRIVATELY
              </span>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #9297A1)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Found someone who understands? Request an anonymous private conversation.
            </p>

            {/* SMALL CHAT PREVIEW BOX */}
            <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ alignSelf: 'flex-end', background: 'var(--accent-mint-dim, rgba(123, 224, 179, 0.12))', border: '1px solid var(--accent-mint-border)', padding: '8px 12px', borderRadius: '10px 10px 2px 10px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  You: "How did you handle it?"
                </div>
                <div style={{ alignSelf: 'flex-start', background: 'var(--surface-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px 10px 10px 2px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Anonymous Moon: "I started practicing with a timer..."
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--accent-mint)', marginTop: '8px', textAlign: 'center' }}>
                🔒 Both students remain anonymous.
              </div>
            </div>
          </div>

          {/* VERTICAL CONNECTOR */}
          <div style={{ height: '32px', width: '2px', backgroundColor: 'var(--accent-mint-border)', margin: '4px 0', position: 'relative' }}>
            <span style={{ position: 'absolute', bottom: '-8px', left: '-4px', fontSize: '0.7rem', color: 'var(--accent-mint)' }}>↓</span>
          </div>

          {/* STEP 4: 🌱 04 — IF NOBODY MATCHES */}
          <div style={{
            width: '100%',
            backgroundColor: 'var(--surface-primary, #111318)',
            border: '1px dashed var(--accent-mint-border, rgba(123, 224, 179, 0.3))',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>🌱</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-mint, #7BE0B3)', letterSpacing: '0.05em' }}>
                04 — IF NOBODY MATCHES
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              No forced matches. If nobody has shared something closely related:
            </p>
            <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
              “Your experience could be the first.”
            </div>
            <button
              type="button"
              className="btn-auth-primary"
              style={{ width: 'auto', padding: '10px 22px', margin: '0 auto', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center' }}
              onClick={() => navigate('/share')}
            >
              Start the conversation →
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
