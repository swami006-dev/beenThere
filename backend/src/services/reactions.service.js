const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const { BadRequestError, ForbiddenError, AppError } = require('../utils/errors');

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
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

    const client = userClient || supabase;
    const { data, error } = await client
      .from('post_reactions')
      .select('*')
      .eq('post_id', postId);

    let reactions = [];

    if (error) {
      console.error('❌ [ReactionsService.getPostReactions] Supabase error:', error.message, error.details || '');
      if (process.env.NODE_ENV !== 'production' && error.code === 'PGRST205') {
        console.warn('⚠️ [ReactionsService] Falling back to local disk store in non-production because post_reactions table is not yet migrated.');
        const store = loadStore();
        reactions = store.filter(r => r.post_id === postId);
      } else {
        throw new AppError(`Failed to load reactions: ${error.message}`, 500, error.code || 'DATABASE_ERROR');
      }
    } else {
      reactions = Array.isArray(data) ? data : [];
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

    const client = userClient || supabase;

    // Check existing reaction in database
    const { data: existingRows, error: checkErr } = await client
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .eq('reaction_type', reactionType);

    if (checkErr && !(process.env.NODE_ENV !== 'production' && checkErr.code === 'PGRST205')) {
      console.error('❌ [ReactionsService.toggleReaction] Check error:', checkErr.message);
      throw new AppError(`Failed to check existing reaction: ${checkErr.message}`, 500, checkErr.code || 'DATABASE_ERROR');
    }

    let hasReacted = false;
    const isPresent = Array.isArray(existingRows) && existingRows.length > 0;

    if (isPresent) {
      // Remove reaction
      const { error: delErr } = await client
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType);

      if (delErr) {
        console.error('❌ [ReactionsService.toggleReaction] Delete error:', delErr.message);
        throw new AppError(`Failed to remove reaction: ${delErr.message}`, 500, delErr.code || 'DATABASE_ERROR');
      }
      hasReacted = false;
    } else if (checkErr && process.env.NODE_ENV !== 'production' && checkErr.code === 'PGRST205') {
      // Dev fallback when table not migrated
      const store = loadStore();
      const existingIndex = store.findIndex(r => r.post_id === postId && r.user_id === user.id && r.reaction_type === reactionType);
      if (existingIndex !== -1) {
        store.splice(existingIndex, 1);
        saveStore(store);
        hasReacted = false;
      } else {
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
      }
      const helpfulCount = store.filter(r => r.post_id === postId && r.reaction_type === 'helpful').length;
      return { postId, helpfulCount, count: helpfulCount, hasReacted, userReacted: hasReacted };
    } else {
      // Add reaction
      const record = {
        id: randomUUID(),
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType,
        created_at: new Date().toISOString()
      };

      const { error: insErr } = await client
        .from('post_reactions')
        .insert(record);

      if (insErr) {
        console.error('❌ [ReactionsService.toggleReaction] Insert error:', insErr.message);
        throw new AppError(`Failed to save reaction: ${insErr.message}`, 500, insErr.code || 'DATABASE_ERROR');
      }
      hasReacted = true;
    }

    // Get updated count from Supabase
    const { data: updatedRows } = await client
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('reaction_type', 'helpful');

    const helpfulCount = Array.isArray(updatedRows) ? updatedRows.length : (hasReacted ? 1 : 0);

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
