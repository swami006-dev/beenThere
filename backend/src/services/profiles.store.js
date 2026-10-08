const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../db/profiles_store.json');

class ProfilesStore {
  static load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('ProfilesStore read warning:', e.message);
    }
    return { profiles: {}, posts: {} };
  }

  static save(data) {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('ProfilesStore save error:', e.message);
    }
  }

  static setProfile(profileId, { userId, displayName, avatarKey }) {
    if (!profileId) return;
    const data = this.load();
    data.profiles = data.profiles || {};
    data.profiles[profileId] = {
      profileId,
      userId,
      displayName: displayName || 'Anonymous Student',
      avatarKey: avatarKey || 'owl',
      updatedAt: new Date().toISOString()
    };
    this.save(data);
  }

  static getProfile(profileId) {
    if (!profileId) return null;
    const data = this.load();
    return data.profiles?.[profileId] || null;
  }

  static getProfileByUserId(userId) {
    if (!userId) return null;
    const data = this.load();
    const profiles = Object.values(data.profiles || {});
    return profiles.find(p => p.userId === userId) || null;
  }

  static linkPost(postId, { authorUserId, authorAnonymousProfileId, title, category }) {
    if (!postId) return;
    const data = this.load();
    data.posts = data.posts || {};
    data.posts[postId] = {
      postId,
      authorUserId: authorUserId || null,
      authorAnonymousProfileId: authorAnonymousProfileId || null,
      title: title || 'Student Reflection',
      category: category || 'General',
      updatedAt: new Date().toISOString()
    };
    this.save(data);
  }

  static getPostMeta(postId) {
    if (!postId) return null;
    const data = this.load();
    return data.posts?.[postId] || null;
  }
}

module.exports = ProfilesStore;
