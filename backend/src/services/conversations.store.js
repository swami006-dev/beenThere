const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../db/conversations_store.json');

class ConversationsStore {
  static load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('ConversationsStore load warning:', e.message);
    }
    return { requests: {}, conversations: {}, messages: {} };
  }

  static save(data) {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('ConversationsStore save error:', e.message);
    }
  }

  static saveRequest(req) {
    if (!req || !req.id) return;
    const data = this.load();
    data.requests = data.requests || {};
    data.requests[req.id] = req;
    this.save(data);
  }

  static getRequest(id) {
    if (!id) return null;
    const data = this.load();
    return data.requests?.[id] || null;
  }

  static updateRequest(id, updates) {
    if (!id) return null;
    const data = this.load();
    if (data.requests?.[id]) {
      data.requests[id] = { ...data.requests[id], ...updates, updated_at: new Date().toISOString() };
      this.save(data);
      return data.requests[id];
    }
    return null;
  }

  static listRequestsForUser(userId) {
    if (!userId) return [];
    const data = this.load();
    const reqs = Object.values(data.requests || {});
    return reqs
      .filter(r => r.requester_user_id === userId || r.recipient_user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  static findExistingRequest(experiencePostId, requesterUserId, recipientUserId) {
    const data = this.load();
    const reqs = Object.values(data.requests || {});
    return reqs.find(r =>
      r.experience_post_id === experiencePostId &&
      r.requester_user_id === requesterUserId &&
      r.recipient_user_id === recipientUserId &&
      ['pending', 'accepted'].includes(r.status)
    );
  }

  static saveConversation(conv) {
    if (!conv || !conv.id) return;
    const data = this.load();
    data.conversations = data.conversations || {};
    data.conversations[conv.id] = conv;
    this.save(data);
  }

  static getConversation(id) {
    if (!id) return null;
    const data = this.load();
    return data.conversations?.[id] || null;
  }

  static updateConversation(id, updates) {
    if (!id) return null;
    const data = this.load();
    if (data.conversations?.[id]) {
      data.conversations[id] = { ...data.conversations[id], ...updates };
      this.save(data);
      return data.conversations[id];
    }
    return null;
  }

  static listConversationsForUser(userId) {
    if (!userId) return [];
    const data = this.load();
    const convs = Object.values(data.conversations || {});
    return convs
      .filter(c => c.participant1_user_id === userId || c.participant2_user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  static saveMessage(msg) {
    if (!msg || !msg.id) return;
    const data = this.load();
    data.messages = data.messages || {};
    if (!data.messages[msg.conversation_id]) {
      data.messages[msg.conversation_id] = [];
    }
    const list = data.messages[msg.conversation_id];
    const existingIndex = list.findIndex(m => m.id === msg.id);
    if (existingIndex >= 0) {
      list[existingIndex] = msg;
    } else {
      list.push(msg);
    }
    this.save(data);
  }

  static listMessagesForConversation(convId) {
    if (!convId) return [];
    const data = this.load();
    const msgs = data.messages?.[convId] || [];
    return msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
}

module.exports = ConversationsStore;
