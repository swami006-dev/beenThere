import React from 'react';

/**
 * Calm, accessible, non-flashy loading indicator component.
 * Contextual labels:
 * - Post detail: "Finding your reflection..."
 * - Matching page: "Finding people who've been here before..."
 * - Private conversation: "Opening your conversation..."
 */
export function CalmLoader({ 
  label = "Finding your reflection...", 
  subtext = null, 
  minHeight = "360px" 
}) {
  return (
    <div 
      className="calm-loader-container" 
      role="status" 
      aria-live="polite" 
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: minHeight,
        padding: '40px 20px',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="calm-spinner"
        style={{
          width: '24px',
          height: '24px',
          marginBottom: '16px'
        }}
      />
      <h3 style={{
        fontSize: '1.05rem',
        fontWeight: 500,
        color: 'var(--text-primary, #f8fafc)',
        margin: '0 0 6px 0',
        letterSpacing: '-0.01em'
      }}>
        {label}
      </h3>
      {subtext && (
        <p style={{
          fontSize: '0.88rem',
          color: 'var(--text-secondary, #94a3b8)',
          margin: 0,
          maxWidth: '380px',
          lineHeight: '1.4'
        }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
