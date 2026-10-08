import React from 'react';

const STEPS = [
  {
    step: '01',
    heading: 'YOU SHARE',
    subtext: 'Type whatever you are silently holding. An exam score, isolation in a dorm room, or the terror of dropping out. No user profile is ever published.'
  },
  {
    step: '02',
    heading: 'WE FIND SOMETHING CLOSE',
    subtext: 'Rather than ranking content for viral outrage or engagement, our system searches historical student accounts for deep situational resonance.'
  },
  {
    step: '03',
    heading: 'SOMEONE HAS BEEN THERE',
    subtext: 'You discover someone from another university who went through that exact crisis 6 months or 2 years ago, and made it to the other side.'
  },
  {
    step: '04',
    heading: 'YOU LEARN FROM THEIR EXPERIENCE',
    subtext: 'Read what they wish they had known in that hour. What actually helped, and what allowed them to forgive themselves and keep going.'
  }
];

export function HowItWorks() {
  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="container">
        
        <header className="how-header">
          <div className="section-label">
            <span className="label-index">04</span>
            <span className="label-text">The Principle</span>
          </div>
          <h2 className="how-title">How it works</h2>
          <p className="how-subtitle">
            Not an endless social feed. A direct line from distress to perspective.
          </p>
        </header>

        {/* Visual Typography Loop with Connecting Lines */}
        <div className="loop-flow-grid">
          {STEPS.map((item, index) => (
            <div key={item.step} className="loop-step-item">
              <div className="loop-step-header">
                <span className="loop-step-num">{item.step}</span>
                {index < STEPS.length - 1 && (
                  <div className="loop-step-connector" aria-hidden="true" />
                )}
              </div>

              <h3 className="loop-step-heading">{item.heading}</h3>
              <p className="loop-step-subtext">{item.subtext}</p>
            </div>
          ))}
        </div>

        {/* Contrast callout */}
        <div className="how-contrast-card">
          <div className="contrast-left">
            <span className="contrast-badge">The distinction</span>
            <p className="contrast-quote">
              “Most platforms ask: <em>What is trending right now?</em><br />
              BeenThere asks: <em>Has someone walked this exact path before?</em>”
            </p>
          </div>
          <div className="contrast-right">
            <div className="contrast-stat">
              <span className="stat-number">0%</span>
              <span className="stat-label">Algorithmic feeds or doomscrolling</span>
            </div>
            <div className="contrast-stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Anonymous peer-to-peer reflection</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
