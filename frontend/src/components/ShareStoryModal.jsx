import React, { useState, useEffect } from 'react';

export function ShareStoryModal({ isOpen, onClose, onStorySubmitted }) {
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('academic');
  const [excerpt, setExcerpt] = useState('');
  const [fullStory, setFullStory] = useState('');
  const [whatHelped, setWhatHelped] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!excerpt.trim() && !fullStory.trim()) return;

    const newStory = {
      id: `exp-${Date.now()}`,
      category,
      categoryLabel: category === 'academic' ? 'Academic Pressure' :
                     category === 'loneliness' ? 'Loneliness & Belonging' :
                     category === 'career' ? 'Career & Identity' : 'Burnout & Recovery',
      topic: category === 'academic' ? 'Academic shock' :
             category === 'loneliness' ? 'Isolation' :
             category === 'career' ? 'Career path' : 'Mental health',
      excerpt: excerpt.trim() || fullStory.trim().slice(0, 90) + '...',
      author: 'Anonymous',
      context: context.trim() || 'College student',
      timeAgo: 'Just now',
      readTime: '2 min read',
      tags: ['Student experience', 'Anonymous reflection'],
      previewSnippet: fullStory.trim().slice(0, 140) + '...',
      fullStory: [fullStory.trim() || excerpt.trim()],
      whatHelped: whatHelped.trim() ? [whatHelped.trim()] : ['Speaking with someone who survived the same moment.']
    };

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onStorySubmitted(newStory);
      onClose();
    }, 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
      <div className="modal-sheet composer-modal-sheet" onClick={(e) => e.stopPropagation()}>
        
        {/* Top bar */}
        <div className="modal-top-bar">
          <div className="modal-meta-crumbs">
            <span className="crumb-badge">Anonymous Reflection</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-context">Protected Space</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {isSuccess ? (
          <div className="composer-success-state">
            <div className="success-icon-ring">✓</div>
            <h3 className="success-heading">Your reflection was received.</h3>
            <p className="success-subtext">
              Thank you. Another student will read this and realize they are not the first to feel this way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-scroll-area">
            <h2 id="share-modal-title" className="composer-heading">
              Share what you’ve been through.
            </h2>
            <p className="composer-subtext">
              Write honestly. You don’t need to sound wise or completely healed—just write what the moment felt like and what helped you through it.
            </p>

            <div className="form-field-group">
              <label htmlFor="share-context" className="form-label">
                Anonymous student context (optional)
              </label>
              <input
                id="share-context"
                type="text"
                className="form-input"
                placeholder="e.g. Sophomore · Computer Science, or 3rd-year Nursing"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
              <span className="form-hint">Do NOT include real names or identifying details.</span>
            </div>

            <div className="form-field-group">
              <label htmlFor="share-category" className="form-label">
                Theme
              </label>
              <select
                id="share-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="academic">Academic pressure & failing exams</option>
                <option value="loneliness">Loneliness & campus isolation</option>
                <option value="career">Career uncertainty & major changes</option>
                <option value="burnout">Burnout, mental health & taking time off</option>
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="share-excerpt" className="form-label">
                One line that captures the feeling
              </label>
              <input
                id="share-excerpt"
                type="text"
                className="form-input"
                placeholder="e.g. I thought failing one exam meant I had to quit."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                required
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="share-story" className="form-label">
                The full reflection
              </label>
              <textarea
                id="share-story"
                className="form-textarea"
                rows={5}
                placeholder="What happened? What was the hardest part? What did you discover afterwards?"
                value={fullStory}
                onChange={(e) => setFullStory(e.target.value)}
                required
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="share-helped" className="form-label">
                What actually helped (optional)
              </label>
              <input
                id="share-helped"
                type="text"
                className="form-input"
                placeholder="e.g. Admitting it to one professor instead of hiding."
                value={whatHelped}
                onChange={(e) => setWhatHelped(e.target.value)}
              />
            </div>

            <div className="composer-footer">
              <div className="composer-privacy-note">
                <span className="privacy-lock-icon" aria-hidden="true">🔒</span>
                <span>Your identity isn't shown to other students.</span>
              </div>

              <div className="composer-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-post">
                  Post anonymously →
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
