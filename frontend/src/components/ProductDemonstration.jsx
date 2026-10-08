import React, { useState } from 'react';
import { DEMO_PRESETS } from '../data/experiences';

export function ProductDemonstration({ 
  currentInputText,
  onOpenStory 
}) {
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  const activePreset = DEMO_PRESETS[activePresetIndex];
  // If user provided custom text in Section 3, display it in the User bubble
  const displayedUserText = currentInputText && currentInputText.trim() 
    ? currentInputText 
    : activePreset.inputText;

  return (
    <section className="product-demo-section" id="demo-section">
      <div className="container-reading">
        <header className="section-header-compact">
          <div className="section-label">
            <span className="label-index">02</span>
            <span className="label-text">The Discovery</span>
          </div>
          <h2 className="demo-heading">How the connection happens.</h2>
          <p className="demo-subtext">
            Not an algorithm judging your worth. A quiet filter finding someone who survived the exact moment you are in.
          </p>
        </header>

        {/* Demo Switcher tabs */}
        <div className="demo-presets-nav" role="tablist" aria-label="Example student experiences">
          <span className="presets-nav-label">Try another student situation:</span>
          <div className="presets-nav-buttons">
            {DEMO_PRESETS.map((preset, idx) => (
              <button
                key={preset.id}
                type="button"
                role="tab"
                aria-selected={idx === activePresetIndex}
                className={`preset-tab-btn ${idx === activePresetIndex ? 'active' : ''}`}
                onClick={() => setActivePresetIndex(idx)}
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {/* The Live Product Interaction Flow */}
        <div className="interaction-flow-container">
          
          {/* Node 1: User's thought */}
          <div className="flow-node user-node">
            <div className="node-meta">
              <span className="node-role-badge user-badge">YOU</span>
              <span className="node-timestamp">Just now · Private</span>
            </div>
            <div className="node-content user-thought-content">
              “{displayedUserText}”
            </div>
          </div>

          {/* Connection Vector */}
          <div className="flow-connector" aria-hidden="true">
            <div className="connector-line" />
            <div className="connector-badge">
              <span className="connector-dot" />
              <span>Matching shared emotional context</span>
            </div>
            <div className="connector-line" />
          </div>

          {/* Node 2: BeenThere Finding */}
          <div className="flow-node system-node">
            <div className="node-meta">
              <span className="node-role-badge system-badge">BEENTHERE</span>
              <span className="node-timestamp">Found 4 student reflections</span>
            </div>

            <div className="system-response-headline">
              “We found experiences that feel close to yours.”
            </div>

            {/* Related Topics / Tags */}
            <div className="system-tags-row">
              {activePreset.matchTags.map((tag, i) => (
                <span key={i} className="system-topic-tag">
                  {tag}
                </span>
              ))}
            </div>

            {/* The Anonymous Experience Excerpt */}
            <div className="matched-experience-card">
              <blockquote className="matched-excerpt">
                {activePreset.experienceExcerpt.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </blockquote>

              <div className="matched-card-footer">
                <div className="matched-author-info">
                  <span className="author-name">{activePreset.author}</span>
                  <span className="author-dot">·</span>
                  <span className="author-context">{activePreset.context}</span>
                </div>

                <button
                  type="button"
                  className="read-experience-action"
                  onClick={() => onOpenStory(activePreset.fullExpId)}
                >
                  <span>Read their experience</span>
                  <span className="arrow-glyph" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
