import React from 'react';
import { useRouter } from '../context/RouterContext';

export function LoadingState({ message = "Finding someone who's been there…" }) {
  return (
    <div className="system-state-box loading-box" role="status" aria-live="polite">
      <div className="system-pulse-dot" aria-hidden="true" />
      <h3 className="system-state-msg">{message}</h3>
    </div>
  );
}

export function ErrorState({ 
  heading = "Something went wrong.", 
  subtext = "We couldn't load this experience right now.",
  onRetry 
}) {
  const { navigate } = useRouter();

  return (
    <div className="system-state-box error-box" role="alert">
      <div className="system-error-dot" aria-hidden="true">▲</div>
      <h3 className="system-state-msg">{heading}</h3>
      <p className="system-state-subtext">{subtext}</p>
      <div className="system-state-actions">
        {onRetry && (
          <button type="button" className="btn-state-action" onClick={onRetry}>
            Try again
          </button>
        )}
        <button type="button" className="btn-state-secondary" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "💭",
  heading = "No one has shared something like this yet.",
  subtext = "You could be the first.",
  ctaText = "Share what's on your mind →",
  onAction
}) {
  return (
    <div className="system-state-box empty-box">
      <div className="system-empty-icon" aria-hidden="true">{icon}</div>
      <h3 className="system-state-msg">{heading}</h3>
      <p className="system-state-subtext">{subtext}</p>
      {ctaText && (
        <button type="button" className="btn-state-action" onClick={onAction}>
          {ctaText}
        </button>
      )}
    </div>
  );
}
