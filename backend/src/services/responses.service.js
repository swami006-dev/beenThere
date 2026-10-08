const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const AuthService = require('./auth.service');
const ProfilesStore = require('./profiles.store');
const { NotFoundError, ForbiddenError, AppError } = require('../utils/errors');

const STORE_PATH = path.join(__dirname, '../db/responses_store.json');

function loadResponsesStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load responses store from file:', e.message);
  }
  return [];
}

function saveResponsesStore(items) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to write responses store to file:', e.message);
  }
}

function formatResponseDTO(resp, anonymousProfile = {}) {
  const joinProfile = resp.anonymous_profiles || resp.anonymous_profile;
  const anonProfId = resp.anonymous_profile_id || resp.anonymousProfileId || anonymousProfile?.id;
  const storeProfile = anonProfId ? ProfilesStore.getProfile(anonProfId) : null;

  const nameFromJoin = joinProfile?.display_name || joinProfile?.anonymous_display_name || joinProfile?.anonymous_name || joinProfile?.anonymousDisplayName;
  const nameFromAnon = anonymousProfile?.anonymousDisplayName || anonymousProfile?.display_name || anonymousProfile?.anonymous_display_name || anonymousProfile?.anonymous_name;
  const nameFromStore = storeProfile?.displayName;
  const finalName = nameFromJoin || nameFromAnon || nameFromStore || 'Anonymous Student';

  const avatarFromJoin = joinProfile?.avatar_key || joinProfile?.avatarKey;
  const avatarFromAnon = anonymousProfile?.avatarKey || anonymousProfile?.avatar_key;
  const avatarFromStore = storeProfile?.avatarKey;
  const finalAvatar = avatarFromJoin || avatarFromAnon || avatarFromStore || 'owl';

  return {
    id: resp.id,
    postId: resp.post_id || resp.postId,
    content: resp.content || '',
    createdAt: resp.created_at || resp.createdAt || new Date().toISOString(),
    anonymousDisplayName: finalName,
    avatarKey: finalAvatar,
    anonymousProfileId: anonProfId || null
  };
}

class ResponsesService {
  static async listResponses(userClient = supabase, postId) {
    let list = [];
    try {
      let query = userClient
        .from('responses')
        .select('*, anonymous_profiles(display_name, avatar_key)')
        .order('created_at', { ascending: true });

      if (postId) {
        query = query.eq('post_id', postId);
      }

      const { data: responses, error } = await query;
      if (!error && Array.isArray(responses)) {
        list = responses.map((r) => formatResponseDTO(r));
      } else if (error) {
        // Fallback without join
        let plainQuery = userClient
          .from('responses')
          .select('*')
          .order('created_at', { ascending: true });
        if (postId) plainQuery = plainQuery.eq('post_id', postId);
        const { data: plainData } = await plainQuery;
        if (Array.isArray(plainData)) {
          list = plainData.map((r) => formatResponseDTO(r));
        }
      }
    } catch (e) {
      console.warn('DB listResponses warning:', e.message);
    }

    // In dev, include any memory cache
    if (postId && ResponsesService.responsesMemoryCache && ResponsesService.responsesMemoryCache.has(postId)) {
      const cached = ResponsesService.responsesMemoryCache.get(postId);
      cached.forEach(r => {
        if (!list.some(existing => existing.id === r.id)) {
          list.push(formatResponseDTO(r));
        }
      });
    }

    return list;
  }

  static async createResponse(userClient, user, { postId, content }) {
    let anonProfile = null;
    try {
      anonProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);
    } catch (e) {
      console.warn('Could not getOrCreateAnonymousProfile in createResponse:', e.message);
    }

    const responseId = randomUUID();
    const responseData = {
      id: responseId,
      post_id: postId,
      anonymous_profile_id: anonProfile?.id || null,
      content,
      status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let created = null;
    const res = await userClient
      .from('responses')
      .insert(responseData)
      .select('*, anonymous_profiles(display_name, avatar_key)')
      .maybeSingle();

    if (res.data) {
      created = res.data;
    } else if (res.error) {
      // Try plain insert if join select had RLS restrictions
      const plainRes = await userClient
        .from('responses')
        .insert(responseData)
        .select()
        .maybeSingle();

      if (plainRes.data) {
        created = plainRes.data;
      } else if (plainRes.error) {
        console.error('❌ [ResponsesService.createResponse] Supabase error:', plainRes.error.message);
        if (process.env.NODE_ENV !== 'production') {
          // Dev fallback
          if (!ResponsesService.responsesMemoryCache) ResponsesService.responsesMemoryCache = new Map();
          if (!ResponsesService.responsesMemoryCache.has(postId)) ResponsesService.responsesMemoryCache.set(postId, []);
          ResponsesService.responsesMemoryCache.get(postId).push(responseData);
          const diskResponses = loadResponsesStore();
          diskResponses.push(responseData);
          saveResponsesStore(diskResponses);
        } else {
          throw new AppError(`Failed to save discussion response: ${plainRes.error.message}`, 500, plainRes.error.code || 'DATABASE_ERROR');
        }
      }
    }

    return formatResponseDTO(created || responseData, anonProfile);
  }

  static async updateResponse(userClient, user, id, { content }) {
    const { data: resp, error: fetchErr } = await userClient
      .from('responses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !resp) {
      throw new NotFoundError(`Response with ID '${id}' not found`);
    }

    if (resp.user_id && resp.user_id !== user.id) {
      throw new ForbiddenError('You can only update your own responses');
    }

    const { data: updated, error: updateErr } = await userClient
      .from('responses')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, anonymous_profiles(display_name, avatar_key)')
      .maybeSingle();

    if (updateErr || !updated) {
      return formatResponseDTO({ ...resp, content });
    }

    return formatResponseDTO(updated);
  }

  static async deleteResponse(userClient, user, id) {
    const { data: resp, error: fetchErr } = await userClient
      .from('responses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !resp) {
      throw new NotFoundError(`Response with ID '${id}' not found`);
    }

    if (resp.user_id && resp.user_id !== user.id) {
      throw new ForbiddenError('You can only delete your own responses');
    }

    const { error: delErr } = await userClient
      .from('responses')
      .delete()
      .eq('id', id);

    if (delErr) {
      throw new AppError(`Failed to delete response: ${delErr.message}`, 500, delErr.code || 'DATABASE_ERROR');
    }

    return { id, deleted: true };
  }
}

module.exports = ResponsesService;
