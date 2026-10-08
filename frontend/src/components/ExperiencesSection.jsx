import React, { useState } from 'react';
import { EXPERIENCES_DATA } from '../data/experiences';

const CATEGORIES = [
  { id: 'all', label: 'All reflections' },
  { id: 'academic', label: 'Academic shock' },
  { id: 'loneliness', label: 'Loneliness & belonging' },
  { id: 'career', label: 'Career uncertainty' },
  { id: 'burnout', label: 'Burnout & leave' }
];

export function ExperiencesSection({ onOpenStory }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredExperiences = activeCategory === 'all'
    ? EXPERIENCES_DATA
    : EXPERIENCES_DATA.filter(item => item.category === activeCategory);

  return (
    <section className="experiences-section" id="experiences">
      <div className="container">
        
        {/* Section Header */}
        <div className="experiences-header-wrap">
          <div className="section-label">
            <span className="label-index">03</span>
            <span className="label-text">The Archive</span>
          </div>
          <h2 className="experiences-heading">People who’ve been there.</h2>
          <p className="experiences-subtext">
            Not advice influencers. Just students writing what happened after the moment they thought was the end of the world.
          </p>

          {/* Filter Bar */}
          <div className="category-filter-bar" role="tablist" aria-label="Filter experiences by topic">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Asymmetrical Editorial Gallery */}
        <div className="editorial-collection-layout">
          {filteredExperiences.map((item, index) => {
            // Apply varied visual rhythm classes: featured, compact, wide
            const isFeatured = index === 0;
            const isWide = index === 3;
            const layoutVariant = isFeatured 
              ? 'layout-featured' 
              : isWide 
                ? 'layout-wide' 
                : (index % 2 === 1 ? 'layout-offset-left' : 'layout-offset-right');

            return (
              <article 
                key={item.id} 
                className={`experience-entry ${layoutVariant}`}
                onClick={() => onOpenStory(item.id)}
              >
                <div className="entry-header">
                  <span className="entry-category-badge">{item.categoryLabel}</span>
                  <span className="entry-read-time">{item.readTime}</span>
                </div>

                <blockquote className="entry-quote">
                  “{item.excerpt}”
                </blockquote>

                {item.previewSnippet && (
                  <p className="entry-snippet">
                    {item.previewSnippet}
                  </p>
                )}

                <div className="entry-footer">
                  <div className="entry-meta">
                    <span className="meta-author">{item.author}</span>
                    <span className="meta-dot">·</span>
                    <span className="meta-context">{item.context}</span>
                    <span className="meta-dot">·</span>
                    <span className="meta-time">{item.timeAgo}</span>
                  </div>

                  <button 
                    type="button" 
                    className="entry-read-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStory(item.id);
                    }}
                    aria-label={`Read experience by ${item.context}`}
                  >
                    <span>Read experience</span>
                    <span className="arrow" aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}
