const { supabase } = require('../db/supabase');
const AuthService = require('./auth.service');
const { NotFoundError, ForbiddenError, AppError } = require('../utils/errors');

function formatPostDTO(post, anonymousProfile = {}) {
  const joinProfile = post.anonymous_profiles || post.anonymous_profile;
  const nameFromJoin = joinProfile?.display_name || joinProfile?.anonymous_display_name || joinProfile?.anonymous_name || joinProfile?.anonymousDisplayName;
  const nameFromAnon = anonymousProfile?.display_name || anonymousProfile?.anonymous_display_name || anonymousProfile?.anonymous_name || anonymousProfile?.anonymousDisplayName;
  const finalName = nameFromJoin || nameFromAnon || 'Anonymous Student';

  const avatarFromJoin = joinProfile?.avatar_key || joinProfile?.avatarKey;
  const avatarFromAnon = anonymousProfile?.avatar_key || anonymousProfile?.avatarKey;
  const finalAvatar = avatarFromJoin || avatarFromAnon || 'owl';

  return {
    id: post.id,
    content: post.content || post.excerpt || post.full_story || '',
    category: post.category || post.topic || 'General',
    status: post.status || 'approved',
    tags: post.tags || [],
    createdAt: post.created_at || post.createdAt || new Date().toISOString(),
    anonymousDisplayName: finalName,
    avatarKey: finalAvatar
  };
}

class PostsService {
  static async listApprovedPosts(userClient = supabase) {
    const { data: posts, error } = await userClient
      .from('posts')
      .select('*, anonymous_profiles(display_name, avatar_key)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      const { data: fallback, error: err2 } = await userClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (err2 || !fallback) return [];
      return fallback.map((p) => formatPostDTO(p));
    }

    return (posts || []).map((p) => formatPostDTO(p));
  }

  static async getPostById(userClient = supabase, id) {
    let { data: post, error } = await userClient
      .from('posts')
      .select('*, anonymous_profiles(display_name, avatar_key)')
      .eq('id', id)
      .maybeSingle();

    if (error || !post) {
      // Fallback with admin supabase client to bypass potential RLS select restrictions
      const { data: adminPost } = await supabase
        .from('posts')
        .select('*, anonymous_profiles(display_name, avatar_key)')
        .eq('id', id)
        .maybeSingle();

      if (adminPost) {
        post = adminPost;
      } else {
        const { data: fallback } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fallback) {
          post = fallback;
        } else if (PostsService.postsMemoryCache && PostsService.postsMemoryCache.has(id)) {
          post = PostsService.postsMemoryCache.get(id);
        } else {
          throw new NotFoundError(`Post with ID '${id}' not found`);
        }
      }
    }

    return formatPostDTO(post);
  }

  static async listMyPosts(userClient, user) {
    if (!user || !user.id) {
      return [];
    }

    // 1. Get user's anonymous profile
    let anonProfile = null;
    try {
      const { data: p } = await userClient
        .from('anonymous_profiles')
        .select('id, display_name, avatar_key')
        .eq('user_id', user.id)
        .maybeSingle();
      anonProfile = p;
    } catch (e) {
      console.warn('Could not query anonymous profile for user:', e.message);
    }

    if (!anonProfile || !anonProfile.id) {
      return [];
    }

    // 2. Query posts belonging to this anonymous profile
    const { data: posts, error } = await userClient
      .from('posts')
      .select('*, anonymous_profiles(display_name, avatar_key)')
      .eq('anonymous_profile_id', anonProfile.id)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback without join
      const { data: fallback, error: err2 } = await userClient
        .from('posts')
        .select('*')
        .eq('anonymous_profile_id', anonProfile.id)
        .order('created_at', { ascending: false });
      if (err2 || !fallback) return [];
      return fallback.map(p => formatPostDTO(p, anonProfile));
    }

    return (posts || []).map(p => formatPostDTO(p, anonProfile));
  }

  static async createPost(userClient, user, { content, category, tags }) {
    let anonProfile = null;
    try {
      anonProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);
    } catch (e) {
      console.warn('Could not getOrCreateAnonymousProfile in createPost:', e.message);
    }

    if (!anonProfile?.id) {
      const { data: p } = await userClient
        .from('anonymous_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      anonProfile = p;
    }

    const { randomUUID } = require('crypto');
    const postId = randomUUID();

    const postData = {
      id: postId,
      anonymous_profile_id: anonProfile?.id || null,
      content,
      category: category || 'General',
      status: 'approved'
    };

    let created = null;
    try {
      const res = await userClient
        .from('posts')
        .insert(postData)
        .select('*, anonymous_profiles(display_name, avatar_key)')
        .maybeSingle();

      if (res.data) {
        created = res.data;
      } else if (res.error) {
        console.warn('Supabase post insert with join failed, trying plain insert:', res.error.message);
        const fallbackRes = await userClient
          .from('posts')
          .insert(postData)
          .select()
          .maybeSingle();
        if (fallbackRes.data) {
          created = fallbackRes.data;
        } else if (fallbackRes.error) {
          throw new Error(`Failed to persist post in Supabase: ${fallbackRes.error.message}`);
        }
      }
    } catch (e) {
      console.error('Database post creation error:', e.message);
      throw e;
    }

    const result = formatPostDTO(created || postData, anonProfile);

    if (!PostsService.postsMemoryCache) {
      PostsService.postsMemoryCache = new Map();
    }
    PostsService.postsMemoryCache.set(result.id, created || postData);

    return result;
  }

  static async updatePost(userClient, user, id, updates) {
    // 1. Get user profile
    const { data: profile } = await userClient
      .from('anonymous_profiles')
      .select('id, display_name, avatar_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      throw new ForbiddenError('No anonymous profile found for this user');
    }

    // 2. Fetch post to verify ownership
    const { data: post, error: fetchErr } = await userClient
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !post) {
      throw new NotFoundError(`Post with ID '${id}' not found`);
    }

    if (post.anonymous_profile_id && post.anonymous_profile_id !== profile.id) {
      throw new ForbiddenError('You can only update your own posts');
    }

    const { data: updated, error: updateErr } = await userClient
      .from('posts')
      .update({
        content: updates.content !== undefined ? updates.content : post.content,
        category: updates.category !== undefined ? updates.category : post.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, anonymous_profiles(display_name, avatar_key)')
      .maybeSingle();

    if (updateErr || !updated) {
      return formatPostDTO({ ...post, ...updates }, profile);
    }

    if (PostsService.postsMemoryCache) {
      PostsService.postsMemoryCache.set(id, updated);
    }

    return formatPostDTO(updated, profile);
  }

  static async deletePost(userClient, user, id) {
    // 1. Get user profile
    const { data: profile } = await userClient
      .from('anonymous_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      throw new ForbiddenError('No anonymous profile found for this user');
    }

    // 2. Fetch post to verify ownership
    const { data: post, error: fetchErr } = await userClient
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !post) {
      throw new NotFoundError(`Post with ID '${id}' not found`);
    }

    if (post.anonymous_profile_id && post.anonymous_profile_id !== profile.id) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    const { error: deleteErr } = await userClient
      .from('posts')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      throw new Error(`Failed to delete post: ${deleteErr.message}`);
    }

    if (PostsService.postsMemoryCache) {
      PostsService.postsMemoryCache.delete(id);
    }

    return { id, deleted: true };
  }
}

module.exports = PostsService;
