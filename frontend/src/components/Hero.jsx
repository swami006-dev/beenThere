import React from 'react';
import { THOUGHT_FRAGMENTS } from '../data/experiences';

export function Hero({ onSelectThought, onScrollToWriter }) {
  return (
    <section className="hero-section" id="top">
      {/* Subtle, ambient thought fragments integrated into space */}
      <div className="hero-fragments-layer" aria-hidden="true">
        {THOUGHT_FRAGMENTS.map((frag, idx) => (
          <div
            key={idx}
            className={`thought-fragment fragment-${idx + 1}`}
            style={{
              top: frag.top,
              left: frag.left,
              right: frag.right,
              animationDelay: frag.delay
            }}
            onClick={() => onSelectThought && onSelectThought(frag.text.replace(/[“”"]/g, ''))}
            title="Click to explore this feeling"
          >
            <span className="fragment-marker">·</span>
            <span className="fragment-quote">{frag.text}</span>
          </div>
        ))}
      </div>

      <div className="container hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          <span className="hero-badge-text">Anonymous student peer reflections</span>
        </div>

        <h1 className="hero-title">
          <span>You’re not the first</span>
          <span className="hero-title-highlight">to feel this way.</span>
        </h1>

        <p className="hero-subtitle">
          Someone may have been here before.
        </p>

        <div className="hero-footnote">
          <p className="hero-footnote-text">
            A quiet space where college students share struggles honestly—free from real names, algorithms, or curated perfection.
          </p>
        </div>

        <div className="hero-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="hero-primary-action"
            onClick={onScrollToWriter}
          >
            <span>Share what's on your mind →</span>
          </button>
          <button 
            type="button" 
            className="btn-read-another"
            onClick={() => {
              const el = document.getElementById('how-it-works');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ padding: '12px 20px', fontSize: '0.9rem' }}
          >
            <span>See how it works ↓</span>
          </button>
        </div>
      </div>
    </section>
  );
}
