import React from 'react';

export function FinalCTA({ onFindClick, onExploreClick }) {
  return (
    <section className="final-cta-section">
      <div className="container-reading">
        <div className="final-cta-box">
          <div className="final-cta-preamble">
            <span className="cta-leaf-dot" aria-hidden="true" />
            <span>BeenThere</span>
          </div>

          <h2 className="final-cta-statement">
            <span>Whatever you’re going through,</span>
            <span className="final-cta-accent">someone may have been there before.</span>
          </h2>

          <div className="final-cta-buttons">
            <button 
              type="button" 
              className="btn-primary-find"
              onClick={onFindClick}
            >
              <span>Find someone who’s been there</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>

            <button 
              type="button" 
              className="btn-secondary-explore"
              onClick={onExploreClick}
            >
              Explore experiences
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
