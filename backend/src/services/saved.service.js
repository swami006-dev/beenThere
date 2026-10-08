const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const { BadRequestError, ForbiddenError } = require('../utils/errors');
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

    let savedRows = [];

    // 1. Try querying Supabase
    try {
      const client = userClient || supabase;
      const { data, error } = await client
        .from('saved_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        savedRows = data;
      }
    } catch (e) {
      console.warn('Supabase saved_items query notice:', e.message);
    }

    // 2. Fallback to persistent disk store if Supabase returned 0 rows or table not yet created
    if (savedRows.length === 0) {
      const store = loadStore();
      savedRows = store.filter(item => item.user_id === user.id);
    }

    const savedItemIds = savedRows.map(r => r.item_id);

    // 3. Hydrate items
    const hydratedItems = [];
    for (const row of savedRows) {
      try {
        if (row.item_type === 'post') {
          const post = await PostsService.getPostById(userClient, row.item_id).catch(() => null);
          if (post) {
            hydratedItems.push({ ...post, itemType: 'post', isPost: true, savedAt: row.created_at });
          }
        } else {
          const exp = await ExperiencesService.getExperienceById(userClient, row.item_id).catch(() => null);
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

    // 1. Disk store update (prevents duplicate rows)
    const store = loadStore();
    const existingIndex = store.findIndex(item => item.user_id === user.id && item.item_id === itemId);
    const now = new Date().toISOString();

    const record = {
      id: randomUUID(),
      user_id: user.id,
      item_id: itemId,
      item_type: normalizedType,
      created_at: now
    };

    if (existingIndex === -1) {
      store.push(record);
      saveStore(store);
    }

    // 2. Supabase DB update
    try {
      const client = userClient || supabase;
      await client
        .from('saved_items')
        .upsert(record, { onConflict: 'user_id, item_id' });
    } catch (e) {
      console.warn('Supabase saved_items insert notice:', e.message);
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

    // 1. Disk store update
    const store = loadStore();
    const filtered = store.filter(item => !(item.user_id === user.id && item.item_id === itemId));
    saveStore(filtered);

    // 2. Supabase DB update
    try {
      const client = userClient || supabase;
      await client
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);
    } catch (e) {
      console.warn('Supabase saved_items delete notice:', e.message);
    }

    return {
      success: true,
      saved: false,
      itemId
    };
  }
}

module.exports = SavedService;
