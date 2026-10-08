import React, { useState, useEffect } from 'react';

const SUGGESTED_THOUGHTS = [
  "I’m scared I’m going to fail my coding exam and disappoint everyone.",
  "Everyone in my lectures seems five steps ahead of me.",
  "I switched my major in third year and feel completely behind.",
  "I haven't made a single close friend this semester and weekends hurt."
];

export function WritingInterface({ 
  initialText = '', 
  onSubmitSearch, 
  onSelectPreset 
}) {
  const [content, setContent] = useState(initialText);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (initialText) {
      setContent(initialText);
    }
  }, [initialText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmitSearch(content);
  };

  const handleSelectThought = (thought) => {
    setContent(thought);
    if (onSelectPreset) {
      onSelectPreset(thought);
    }
  };

  return (
    <section className="writing-section" id="write-section">
      <div className="container-reading">
        <header className="section-header-compact">
          <div className="section-label">
            <span className="label-index">01</span>
            <span className="label-text">The Starting Point</span>
          </div>
          <h2 className="writing-heading">What’s been on your mind?</h2>
          <p className="writing-subtext">
            Type anything you are carrying right now. No name is attached, no account is required.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="writing-form">
          <div className={`writing-surface ${isFocused ? 'focused' : ''}`}>
            <textarea
              className="writing-textarea"
              placeholder="Start writing…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={4}
              aria-label="What is on your mind"
            />

            <div className="writing-surface-footer">
              <div className="privacy-pill-indicator">
                <span className="privacy-icon-lock" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <span>Your real identity isn't shown to other students</span>
              </div>

              <button 
                type="submit" 
                className={`find-match-btn ${content.trim() ? 'has-input' : ''}`}
                disabled={!content.trim()}
              >
                <span>Find someone who’s been there</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </form>

        {/* Suggestion pills */}
        <div className="suggested-prompts">
          <span className="prompts-label">Common thoughts students arrive with:</span>
          <div className="prompts-list">
            {SUGGESTED_THOUGHTS.map((thought, idx) => (
              <button
                key={idx}
                type="button"
                className={`prompt-chip ${content === thought ? 'active' : ''}`}
                onClick={() => handleSelectThought(thought)}
              >
                “{thought}”
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
