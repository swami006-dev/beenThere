const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const { BadRequestError, ForbiddenError } = require('../utils/errors');

const STORE_PATH = path.join(__dirname, '../db/post_reactions_store.json');

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load reactions store from file:', e.message);
  }
  return [];
}

function saveStore(items) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to write reactions store to file:', e.message);
  }
}

class ReactionsService {
  static async getPostReactions(userClient, user, postId) {
    if (!postId) {
      throw new BadRequestError('postId is required');
    }

    let reactions = [];

    // 1. Try querying Supabase
    try {
      const client = userClient || supabase;
      const { data, error } = await client
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId);

      if (!error && Array.isArray(data)) {
        reactions = data;
      }
    } catch (e) {
      console.warn('Supabase post_reactions query notice:', e.message);
    }

    // 2. Fallback to disk store
    if (reactions.length === 0) {
      const store = loadStore();
      reactions = store.filter(r => r.post_id === postId);
    }

    const helpfulCount = reactions.filter(r => r.reaction_type === 'helpful').length;
    const hasReacted = user && user.id ? reactions.some(r => r.user_id === user.id && r.reaction_type === 'helpful') : false;

    return {
      postId,
      helpfulCount,
      count: helpfulCount,
      hasReacted,
      userReacted: hasReacted
    };
  }

  static async toggleReaction(userClient, user, postId, reactionType = 'helpful') {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required to react to posts');
    }
    if (!postId) {
      throw new BadRequestError('postId is required');
    }

    const store = loadStore();
    const existingIndex = store.findIndex(r => r.post_id === postId && r.user_id === user.id && r.reaction_type === reactionType);

    let hasReacted = false;

    if (existingIndex !== -1) {
      // Remove reaction (unlike / unhelpful)
      store.splice(existingIndex, 1);
      saveStore(store);
      hasReacted = false;

      try {
        const client = userClient || supabase;
        await client
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType);
      } catch (e) {
        console.warn('Supabase reaction delete notice:', e.message);
      }
    } else {
      // Add reaction
      const record = {
        id: randomUUID(),
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType,
        created_at: new Date().toISOString()
      };
      store.push(record);
      saveStore(store);
      hasReacted = true;

      try {
        const client = userClient || supabase;
        await client
          .from('post_reactions')
          .insert(record);
      } catch (e) {
        console.warn('Supabase reaction insert notice:', e.message);
      }
    }

    const helpfulCount = store.filter(r => r.post_id === postId && r.reaction_type === 'helpful').length;

    return {
      postId,
      helpfulCount,
      count: helpfulCount,
      hasReacted,
      userReacted: hasReacted
    };
  }
}

module.exports = ReactionsService;
