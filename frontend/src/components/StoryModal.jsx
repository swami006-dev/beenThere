import React, { useEffect } from 'react';

export function StoryModal({ story, onClose, onShareOwn }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  if (!story) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="story-modal-title">
      <div className="modal-sheet reading-modal-sheet" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Top Bar */}
        <div className="modal-top-bar">
          <div className="modal-meta-crumbs">
            <span className="crumb-badge">{story.categoryLabel || story.topic}</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-context">{story.context}</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-time">{story.timeAgo}</span>
          </div>

          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close reflection"
          >
            ✕
          </button>
        </div>

        {/* Modal Story Body */}
        <div className="modal-scroll-area">
          <h2 id="story-modal-title" className="modal-story-headline">
            “{story.excerpt}”
          </h2>

          <div className="modal-tags-bar">
            {story.tags && story.tags.map((tag, idx) => (
              <span key={idx} className="modal-tag-pill">{tag}</span>
            ))}
          </div>

          <div className="modal-prose">
            {story.fullStory && story.fullStory.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* What Helped Section */}
          {story.whatHelped && story.whatHelped.length > 0 && (
            <div className="modal-helped-box">
              <h3 className="helped-title">
                <span className="helped-dot" aria-hidden="true" />
                What helped them through it:
              </h3>
              <ul className="helped-list">
                {story.whatHelped.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Reflection Footer */}
          <div className="modal-story-footer">
            <div className="modal-footer-attribution">
              <span className="author-status">Shared anonymously</span>
              <span className="author-sub">Reflections are screened to preserve safety and dignity.</span>
            </div>

            <div className="modal-footer-actions">
              <button 
                type="button" 
                className="modal-btn-share-own"
                onClick={() => {
                  onClose();
                  onShareOwn();
                }}
              >
                I’ve been through something similar →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
