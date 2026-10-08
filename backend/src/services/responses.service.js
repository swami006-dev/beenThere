const { supabase } = require('../db/supabase');
const AuthService = require('./auth.service');
const { NotFoundError, ForbiddenError, AppError } = require('../utils/errors');

function formatResponseDTO(resp, anonymousProfile = {}) {
  const joinProfile = resp.anonymous_profiles || resp.anonymous_profile;
  const nameFromJoin = joinProfile?.display_name || joinProfile?.anonymous_display_name || joinProfile?.anonymous_name || joinProfile?.anonymousDisplayName;
  const nameFromAnon = anonymousProfile?.anonymousDisplayName || anonymousProfile?.display_name || anonymousProfile?.anonymous_display_name || anonymousProfile?.anonymous_name;
  const finalName = nameFromJoin || nameFromAnon || 'Anonymous Student';

  const avatarFromJoin = joinProfile?.avatar_key || joinProfile?.avatarKey;
  const avatarFromAnon = anonymousProfile?.avatarKey || anonymousProfile?.avatar_key;
  const finalAvatar = avatarFromJoin || avatarFromAnon || 'owl';

  return {
    id: resp.id,
    postId: resp.post_id || resp.postId,
    content: resp.content || '',
    createdAt: resp.created_at || resp.createdAt || new Date().toISOString(),
    anonymousDisplayName: finalName,
    avatarKey: finalAvatar
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

      const { data: responses } = await query;
      if (Array.isArray(responses)) {
        list = responses.map((r) => formatResponseDTO(r));
      }
    } catch (e) {
      console.warn('DB listResponses warning:', e.message);
    }

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

    const responseData = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      post_id: postId,
      anonymous_profile_id: anonProfile?.id || null,
      content,
      created_at: new Date().toISOString()
    };

    if (!ResponsesService.responsesMemoryCache) {
      ResponsesService.responsesMemoryCache = new Map();
    }
    if (!ResponsesService.responsesMemoryCache.has(postId)) {
      ResponsesService.responsesMemoryCache.set(postId, []);
    }
    ResponsesService.responsesMemoryCache.get(postId).push(responseData);

    let created = null;
    try {
      const res = await userClient
        .from('responses')
        .insert(responseData)
        .select('*, anonymous_profiles(display_name, avatar_key)')
        .maybeSingle();

      if (res.data) {
        created = res.data;
      }
    } catch (e) {
      console.warn('DB response creation notice:', e.message);
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
      .select('*, anonymous_profiles(anonymous_display_name, avatar_key)')
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

    const { error: deleteErr } = await userClient
      .from('responses')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      throw new Error(`Failed to delete response: ${deleteErr.message}`);
    }

    return { id, deleted: true };
  }
}

module.exports = ResponsesService;
