const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const { BadRequestError, ForbiddenError, AppError } = require('../utils/errors');
const ExperiencesService = require('./experiences.service');
const PostsService = require('./posts.service');

const STORE_PATH = path.join(__dirname, '../db/saved_items_store.json');

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load saved items store from file:', e.message);
  }
  return [];
}

function saveStore(items) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to write saved items store to file:', e.message);
  }
}

class SavedService {
  static async listSaved(userClient, user) {
    if (!user || !user.id) {
      return { savedItemIds: [], items: [] };
    }

    const client = userClient || supabase;
    const { data, error } = await client
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    let savedRows = [];

    if (error) {
      console.error('❌ [SavedService.listSaved] Supabase error:', error.message, error.details || '');
      // Only permit disk fallback in development if table has not been created yet
      if (process.env.NODE_ENV !== 'production' && error.code === 'PGRST205') {
        console.warn('⚠️ [SavedService] Falling back to local disk store in non-production because saved_items table is not yet migrated.');
        const store = loadStore();
        savedRows = store.filter(item => item.user_id === user.id);
      } else {
        throw new AppError(`Failed to load saved items from database: ${error.message}`, 500, error.code || 'DATABASE_ERROR');
      }
    } else {
      savedRows = Array.isArray(data) ? data : [];
    }

    const savedItemIds = savedRows.map(r => r.item_id);

    // Hydrate items
    const hydratedItems = [];
    for (const row of savedRows) {
      try {
        if (row.item_type === 'post') {
          const post = await PostsService.getPostById(client, row.item_id).catch(() => null);
          if (post) {
            hydratedItems.push({ ...post, itemType: 'post', isPost: true, savedAt: row.created_at });
          }
        } else {
          const exp = await ExperiencesService.getExperienceById(client, row.item_id).catch(() => null);
          if (exp) {
            hydratedItems.push({ ...exp, itemType: 'experience', isCanonicalCard: true, savedAt: row.created_at });
          }
        }
      } catch (err) {
        console.warn('Hydration error for saved item:', row.item_id, err.message);
      }
    }

    return {
      savedItemIds,
      items: hydratedItems
    };
  }

  static async saveItem(userClient, user, { itemId, itemType }) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required to save items');
    }
    if (!itemId) {
      throw new BadRequestError('itemId is required');
    }

    const normalizedType = itemType === 'post' ? 'post' : 'experience';
    const now = new Date().toISOString();
    const client = userClient || supabase;

    const record = {
      id: randomUUID(),
      user_id: user.id,
      item_id: itemId,
      item_type: normalizedType,
      created_at: now
    };

    // Primary: Supabase DB update
    const { error } = await client
      .from('saved_items')
      .upsert(record, { onConflict: 'user_id, item_id' });

    if (error) {
      console.error('❌ [SavedService.saveItem] Supabase error:', error.message, error.details || '');
      // Only permit disk fallback in development if table is missing
      if (process.env.NODE_ENV !== 'production' && error.code === 'PGRST205') {
        console.warn('⚠️ [SavedService] Falling back to local disk store in non-production because saved_items table is not yet migrated.');
        const store = loadStore();
        const existingIndex = store.findIndex(item => item.user_id === user.id && item.item_id === itemId);
        if (existingIndex === -1) {
          store.push(record);
          saveStore(store);
        }
      } else {
        throw new AppError(`Failed to save experience in database: ${error.message}`, 500, error.code || 'DATABASE_ERROR');
      }
    } else {
      // Sync local store cache if present
      try {
        const store = loadStore();
        if (!store.some(item => item.user_id === user.id && item.item_id === itemId)) {
          store.push(record);
          saveStore(store);
        }
      } catch (e) {}
    }

    return {
      success: true,
      saved: true,
      itemId,
      itemType: normalizedType
    };
  }

  static async unsaveItem(userClient, user, itemId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required to unsave items');
    }
    if (!itemId) {
      throw new BadRequestError('itemId is required');
    }

    const client = userClient || supabase;
    const { error } = await client
      .from('saved_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_id', itemId);

    if (error) {
      console.error('❌ [SavedService.unsaveItem] Supabase error:', error.message, error.details || '');
      if (process.env.NODE_ENV !== 'production' && error.code === 'PGRST205') {
        console.warn('⚠️ [SavedService] Falling back to local disk store in non-production because saved_items table is not yet migrated.');
        const store = loadStore();
        const filtered = store.filter(item => !(item.user_id === user.id && item.item_id === itemId));
        saveStore(filtered);
      } else {
        throw new AppError(`Failed to unsave experience from database: ${error.message}`, 500, error.code || 'DATABASE_ERROR');
      }
    } else {
      try {
        const store = loadStore();
        const filtered = store.filter(item => !(item.user_id === user.id && item.item_id === itemId));
        saveStore(filtered);
      } catch (e) {}
    }

    return {
      success: true,
      saved: false,
      itemId
    };
  }
}

module.exports = SavedService;
