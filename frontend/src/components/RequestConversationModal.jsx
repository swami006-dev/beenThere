import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';

export function RequestConversationModal({ isOpen, onClose, experience }) {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !experience) return null;

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/conversations/requests', {
        experiencePostId: experience.id,
        targetAnonymousProfileId: experience.targetAnonymousProfileId || undefined,
        message: message.trim()
      });

      setSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Failed to send conversation request:', err);
      setError(err.message || 'Failed to send conversation request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div 
        className="modal-sheet" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: '90%', 
          backgroundColor: 'var(--surface-card, #121815)', 
          border: '1px solid var(--border, #243029)',
          borderRadius: '12px',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-mint, #38d39f)', fontWeight: 600 }}>
            💬 Anonymous 1-to-1 Conversation
          </span>
          <button 
            type="button" 
            onClick={handleClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✉️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '8px' }}>
              Conversation request sent!
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.5', marginBottom: '20px' }}>
              The author has been notified anonymously. If they accept, you will be able to start chatting in your Messages.
            </p>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleClose}
              style={{ width: '100%', padding: '12px' }}
            >
              Got it
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '8px' }}>
              Start an anonymous conversation?
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.5', marginBottom: '18px' }}>
              {experience.recipientName 
                ? `You're requesting to talk anonymously with ${experience.recipientName}.`
                : "You're requesting to talk with someone who shared this experience."}
            </p>

            {error && (
              <div style={{ 
                padding: '12px 14px', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: '6px', 
                color: '#f87171', 
                fontSize: '0.86rem', 
                marginBottom: '16px' 
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSendRequest}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                  Why would you like to talk? (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="I've been going through something similar and would like to know what helped you."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--surface-subtle, #0a0f0d)',
                    border: '1px solid var(--border, #243029)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ 
                padding: '10px 14px', 
                backgroundColor: 'var(--surface-subtle, #0a0f0d)', 
                borderRadius: '6px', 
                border: '1px solid var(--border, #243029)', 
                fontSize: '0.8rem', 
                color: 'var(--text-tertiary, #64748b)', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🛡️</span>
                <span>Your anonymous identity (<strong>{currentUser?.anonymousIdentity || 'Anonymous Student'}</strong>) will be shown. Real names and emails remain private.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border, #243029)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary, #94a3b8)',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    padding: '10px 20px',
                    fontSize: '0.9rem',
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="calm-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#090A0C' }} />
                      <span>Sending request...</span>
                    </span>
                  ) : (
                    'Send request →'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
