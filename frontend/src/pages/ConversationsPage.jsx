import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';
import { CalmLoader } from '../components/CalmLoader';
import { api } from '../config/api';

export function ConversationsPage() {
  const { navigate, match } = useRouter();
  const { isAuthenticated, currentUser, loadingSession } = useAuth();

  const activeConvIdFromUrl = match?.params?.id || null;

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'active' | 'ended'
  const [requests, setRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Safety Controls / Modals State
  const [showMenu, setShowMenu] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (loadingSession) return;
    if (!isAuthenticated) {
      navigate('/login?redirect=/conversations');
      return;
    }

    loadData();
    const interval = setInterval(loadData, 5000); // Polling every 5s for real-time conversation updates
    return () => clearInterval(interval);
  }, [loadingSession, isAuthenticated, activeConvIdFromUrl]);

  const loadData = async () => {
    try {
      const [reqRes, convRes] = await Promise.all([
        api.get('/conversations/requests').catch(() => []),
        api.get('/conversations').catch(() => [])
      ]);

      if (Array.isArray(reqRes)) setRequests(reqRes);
      if (Array.isArray(convRes)) setConversations(convRes);

      // If active conversation ID in URL or selected, load details
      if (activeConvIdFromUrl || selectedConv?.id) {
        const targetId = activeConvIdFromUrl || selectedConv?.id;
        loadConversationDetails(targetId);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load conversations data:', err);
      setLoading(false);
    }
  };

  const loadConversationDetails = async (convId) => {
    try {
      const details = await api.get(`/conversations/${convId}`);
      if (details) {
        setSelectedConv(details);
        setMessages(details.messages || []);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to fetch conversation details:', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleRespondRequest = async (requestId, status) => {
    try {
      const res = await api.post(`/conversations/requests/${requestId}/respond`, { status });
      await loadData();
      if (status === 'accepted' && res?.conversationId) {
        setActiveTab('active');
        loadConversationDetails(res.conversationId);
      }
    } catch (err) {
      console.error('Failed to respond to request:', err);
      alert(err.message || 'Failed to respond to request');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMsg || !selectedConv) return;

    setSendingMsg(true);
    try {
      const sent = await api.post(`/conversations/${selectedConv.id}/messages`, {
        content: newMessage.trim()
      });

      setNewMessage('');
      setMessages(prev => [...prev, sent]);
      setSendingMsg(false);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert(err.message || 'Failed to send message');
      setSendingMsg(false);
    }
  };

  const handleEndConversation = async () => {
    if (!selectedConv) return;
    try {
      await api.post(`/conversations/${selectedConv.id}/end`, {});
      setShowEndModal(false);
      setShowMenu(false);
      await loadConversationDetails(selectedConv.id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to end conversation');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConv) return;
    try {
      await api.post(`/conversations/${selectedConv.id}/block`, {});
      setShowBlockModal(false);
      setShowMenu(false);
      setSelectedConv(null);
      await loadData();
      alert('User has been blocked. You will no longer receive requests or messages from them.');
    } catch (err) {
      alert(err.message || 'Failed to block user');
    }
  };

  const handleReportUser = async (e) => {
    e.preventDefault();
    if (!selectedConv) return;
    try {
      await api.post(`/conversations/${selectedConv.id}/report`, {
        reason: reportReason,
        details: reportDetails
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setShowMenu(false);
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to submit report');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending' && r.isIncoming);
  const activeConversations = conversations.filter(c => c.status === 'active');
  const endedConversations = conversations.filter(c => c.status === 'ended' || c.status === 'blocked');

  if (loading || loadingSession) {
    return (
      <div className="page-shell">
        <AppNavbar />
        <main className="state-screen" style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalmLoader label="Opening your conversation..." minHeight="360px" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <AppNavbar />

      <main style={{ padding: '24px 16px', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Safety Header Banner */}
        <div style={{
          backgroundColor: 'var(--surface-card, #121815)',
          border: '1px solid var(--border, #243029)',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.4rem' }}>🛡️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              Anonymous Peer Support Sanctuary
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
              You're talking anonymously. Don't share personal contact details (phone numbers, emails, handles, addresses).
            </p>
          </div>
        </div>

        {/* Full Chat Screen if Conversation Selected */}
        {selectedConv ? (
          <div style={{
            backgroundColor: 'var(--surface-card, #121815)',
            border: '1px solid var(--border, #243029)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(80vh - 100px)',
            minHeight: '450px',
            maxHeight: '700px',
            overflow: 'hidden'
          }}>
            {/* Chat Top Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border, #243029)',
              backgroundColor: 'var(--surface-subtle, #0a0f0d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedConv(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-mint, #38d39f)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  ← Back
                </button>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                    💬 {selectedConv.selfDisplayName || 'You'} ↔ {selectedConv.otherUserDisplayName}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary, #64748b)' }}>
                    Re: {selectedConv.experienceTitle}
                  </div>
                </div>
              </div>

              {/* Safety Controls Menu (⋯) */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    background: 'var(--surface-primary, #18221d)',
                    border: '1px solid var(--border, #243029)',
                    color: 'var(--text-primary, #f8fafc)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '1.2rem',
                    cursor: 'pointer'
                  }}
                  aria-label="Conversation Options"
                >
                  ⋯
                </button>

                {showMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '40px',
                    backgroundColor: 'var(--surface-card, #121815)',
                    border: '1px solid var(--border, #243029)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    minWidth: '180px',
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); setShowEndModal(true); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-primary, #f8fafc)',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        borderBottom: '1px solid var(--border, #243029)'
                      }}
                    >
                      🛑 End conversation
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); setShowBlockModal(true); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        borderBottom: '1px solid var(--border, #243029)'
                      }}
                    >
                      🚫 Block user
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#fbbf24',
                        cursor: 'pointer',
                        fontSize: '0.88rem'
                      }}
                    >
                      ⚠️ Report user
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Safety Reminder Text inside Chat */}
            <div style={{
              backgroundColor: 'rgba(56, 211, 159, 0.05)',
              borderBottom: '1px solid var(--border, #243029)',
              padding: '8px 16px',
              fontSize: '0.78rem',
              color: 'var(--accent-mint, #38d39f)',
              textAlign: 'center'
            }}>
              🔒 You're talking anonymously. Don't share personal contact details.
            </div>

            {/* Chat Messages Scroll Container */}
            <div style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary, #64748b)', margin: 'auto', fontSize: '0.88rem' }}>
                  No messages yet. Say hello to start the conversation!
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.isSelf ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: m.isSelf ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary, #64748b)', marginBottom: '4px', padding: '0 4px' }}>
                      {m.isSelf ? 'You' : m.senderDisplayName} · {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                    <div style={{
                      backgroundColor: m.isSelf ? 'var(--accent-mint-subtle, #1a382d)' : 'var(--surface-primary, #18221d)',
                      color: 'var(--text-primary, #f8fafc)',
                      border: m.isSelf ? '1px solid var(--accent-mint-border, #2c5e4b)' : '1px solid var(--border, #243029)',
                      padding: '12px 16px',
                      borderRadius: m.isSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '0.92rem',
                      lineHeight: '1.5',
                      wordBreak: 'break-word'
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer or Ended Status Banner */}
            {selectedConv.status === 'active' ? (
              <form onSubmit={handleSendMessage} style={{
                padding: '14px',
                borderTop: '1px solid var(--border, #243029)',
                backgroundColor: 'var(--surface-subtle, #0a0f0d)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    rows={2}
                    placeholder="Write a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--surface-primary, #18221d)',
                      border: '1px solid var(--border, #243029)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--text-primary, #f8fafc)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMsg}
                    className="btn-primary"
                    style={{
                      padding: '0 20px',
                      alignSelf: 'stretch',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (!newMessage.trim() || sendingMsg) ? 0.5 : 1
                    }}
                  >
                    Send
                  </button>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary, #64748b)', textAlign: 'right' }}>
                  Stay anonymous. Don't share personal contact details.
                </div>
              </form>
            ) : (
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--surface-subtle, #0a0f0d)',
                borderTop: '1px solid var(--border, #243029)',
                textAlign: 'center',
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: '0.9rem',
                fontStyle: 'italic'
              }}>
                This conversation has ended.
              </div>
            )}
          </div>
        ) : (
          /* Main Conversations & Requests List */
          <div>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid var(--border, #243029)',
              marginBottom: '20px'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'requests' ? '2px solid var(--accent-mint, #38d39f)' : '2px solid transparent',
                  color: activeTab === 'requests' ? 'var(--accent-mint, #38d39f)' : 'var(--text-secondary, #94a3b8)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>Requests</span>
                {pendingRequests.length > 0 && (
                  <span style={{
                    backgroundColor: 'var(--accent-mint, #38d39f)',
                    color: '#0a0f0d',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    padding: '2px 8px'
                  }}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('active')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'active' ? '2px solid var(--accent-mint, #38d39f)' : '2px solid transparent',
                  color: activeTab === 'active' ? 'var(--accent-mint, #38d39f)' : 'var(--text-secondary, #94a3b8)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer'
                }}
              >
                Active Conversations ({activeConversations.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ended')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'ended' ? '2px solid var(--accent-mint, #38d39f)' : '2px solid transparent',
                  color: activeTab === 'ended' ? 'var(--accent-mint, #38d39f)' : 'var(--text-secondary, #94a3b8)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer'
                }}
              >
                Ended ({endedConversations.length})
              </button>
            </div>

            {/* TAB CONTENT: REQUESTS */}
            {activeTab === 'requests' && (
              <div>
                {requests.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    backgroundColor: 'var(--surface-card, #121815)',
                    border: '1px dashed var(--border, #243029)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.95rem', margin: 0 }}>
                      No private conversation requests yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {requests.map(req => (
                      <div
                        key={req.id}
                        style={{
                          backgroundColor: 'var(--surface-card, #121815)',
                          border: '1px solid var(--border, #243029)',
                          borderRadius: '10px',
                          padding: '20px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--accent-mint, #38d39f)', fontWeight: 600 }}>
                              {req.isIncoming ? 'Incoming Request' : 'Sent Request'}
                            </span>
                            <h4 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', color: 'var(--text-primary, #f8fafc)', fontWeight: 600 }}>
                              {req.isIncoming ? 'Someone related to your experience wants to talk.' : `Requested to talk about experience`}
                            </h4>
                          </div>
                          <span style={{
                            fontSize: '0.76rem',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            backgroundColor: req.status === 'pending' ? 'rgba(251, 191, 36, 0.1)' : req.status === 'accepted' ? 'rgba(56, 211, 159, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: req.status === 'pending' ? '#fbbf24' : req.status === 'accepted' ? '#38d39f' : '#f87171',
                            fontWeight: 600
                          }}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '12px' }}>
                          Re: <strong>{req.experienceTitle}</strong> ({req.category})
                        </div>

                        <div style={{
                          backgroundColor: 'var(--surface-subtle, #0a0f0d)',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          border: '1px solid var(--border, #243029)',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary, #f8fafc)',
                          marginBottom: '16px'
                        }}>
                          <strong>{req.otherUserDisplayName}:</strong> "{req.message || 'I would like to connect about your shared experience.'}"
                        </div>

                        {req.isIncoming && req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(req.id, 'accepted')}
                              className="btn-primary"
                              style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(req.id, 'declined')}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--border, #243029)',
                                color: 'var(--text-secondary, #94a3b8)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.88rem'
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        ) : !req.isIncoming && req.status === 'declined' ? (
                          <div style={{ fontSize: '0.84rem', color: '#f87171' }}>
                            Your conversation request was declined.
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ACTIVE CONVERSATIONS */}
            {activeTab === 'active' && (
              <div>
                {activeConversations.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    backgroundColor: 'var(--surface-card, #121815)',
                    border: '1px dashed var(--border, #243029)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.95rem', margin: 0 }}>
                      No active conversations right now.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeConversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversationDetails(conv.id)}
                        style={{
                          backgroundColor: 'var(--surface-card, #121815)',
                          border: '1px solid var(--border, #243029)',
                          borderRadius: '10px',
                          padding: '18px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'border-color 0.2s'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                            💬 {conv.otherUserDisplayName}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                            Re: {conv.experienceTitle}
                          </div>
                          {conv.lastMessage && (
                            <div style={{ fontSize: '0.84rem', color: 'var(--text-tertiary, #64748b)' }}>
                              {conv.lastMessage.isSelf ? 'You: ' : ''}"{conv.lastMessage.content}"
                            </div>
                          )}
                        </div>
                        <button type="button" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                          Open Chat →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ENDED CONVERSATIONS */}
            {activeTab === 'ended' && (
              <div>
                {endedConversations.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    backgroundColor: 'var(--surface-card, #121815)',
                    border: '1px dashed var(--border, #243029)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.95rem', margin: 0 }}>
                      No ended conversations.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {endedConversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversationDetails(conv.id)}
                        style={{
                          backgroundColor: 'var(--surface-card, #121815)',
                          border: '1px solid var(--border, #243029)',
                          borderRadius: '10px',
                          padding: '18px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          opacity: 0.8
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                            💬 {conv.otherUserDisplayName} ({conv.status.toUpperCase()})
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
                            Re: {conv.experienceTitle}
                          </div>
                        </div>
                        <button type="button" style={{ padding: '6px 14px', fontSize: '0.82rem', backgroundColor: 'transparent', border: '1px solid var(--border, #243029)', color: 'var(--text-secondary, #94a3b8)', borderRadius: '6px', cursor: 'pointer' }}>
                          View History
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: END CONVERSATION */}
      {showEndModal && (
        <div className="modal-backdrop" onClick={() => setShowEndModal(false)} role="dialog" aria-modal="true">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px', backgroundColor: 'var(--surface-card, #121815)', border: '1px solid var(--border, #243029)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '8px' }}>
              End this conversation?
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '20px' }}>
              You can leave at any time. Once ended, neither participant will be able to send new messages.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--border, #243029)', color: 'var(--text-secondary, #94a3b8)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Keep talking
              </button>
              <button
                type="button"
                onClick={handleEndConversation}
                style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                End conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BLOCK USER */}
      {showBlockModal && (
        <div className="modal-backdrop" onClick={() => setShowBlockModal(false)} role="dialog" aria-modal="true">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px', backgroundColor: 'var(--surface-card, #121815)', border: '1px solid var(--border, #243029)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f87171', marginBottom: '8px' }}>
              Block this user?
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '20px' }}>
              This will immediately end the conversation and prevent any future conversation requests or messages between you two.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--border, #243029)', color: 'var(--text-secondary, #94a3b8)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockUser}
                style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Block user
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REPORT USER */}
      {showReportModal && (
        <div className="modal-backdrop" onClick={() => setShowReportModal(false)} role="dialog" aria-modal="true">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '24px', backgroundColor: 'var(--surface-card, #121815)', border: '1px solid var(--border, #243029)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '8px' }}>
              Report user / conversation
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '16px' }}>
              Reports are quietly reviewed by human moderators to ensure safety.
            </p>

            {reportSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--accent-mint, #38d39f)' }}>
                ✓ Report submitted quietly for human moderator review.
              </div>
            ) : (
              <form onSubmit={handleReportUser}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                    Reason:
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--surface-subtle, #0a0f0d)',
                      border: '1px solid var(--border, #243029)',
                      borderRadius: '6px',
                      padding: '10px',
                      color: 'var(--text-primary, #f8fafc)',
                      fontSize: '0.88rem'
                    }}
                  >
                    <option value="Harassment">Harassment</option>
                    <option value="Inappropriate content">Inappropriate content</option>
                    <option value="Spam">Spam</option>
                    <option value="Asking for personal information">Asking for personal information</option>
                    <option value="Threatening behavior">Threatening behavior</option>
                    <option value="Self-harm / safety concern">Self-harm / safety concern</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                    Additional details (Optional):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide any additional context..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--surface-subtle, #0a0f0d)',
                      border: '1px solid var(--border, #243029)',
                      borderRadius: '6px',
                      padding: '10px',
                      color: 'var(--text-primary, #f8fafc)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--border, #243029)', color: 'var(--text-secondary, #94a3b8)', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '10px 18px', backgroundColor: '#fbbf24', color: '#0a0f0d', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Submit report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
