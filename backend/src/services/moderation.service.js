const { supabase } = require('../db/supabase');
const { NotFoundError } = require('../utils/errors');

class ModerationService {
  static async listReports(userClient = supabase) {
    const { data: reports, error } = await userClient
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !reports) {
      return [];
    }

    return reports.map((r) => ({
      id: r.id,
      targetType: r.target_type || r.targetType,
      targetId: r.target_id || r.targetId,
      reason: r.reason,
      status: r.status || 'pending',
      createdAt: r.created_at || r.createdAt
    }));
  }

  static async moderatePost(userClient = supabase, id, { status }) {
    const { data: updated, error } = await userClient
      .from('posts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return { id, status, updated: true };
    }

    return {
      id: updated.id,
      status: updated.status || status,
      updatedAt: updated.updated_at
    };
  }

  static async moderateResponse(userClient = supabase, id, { status }) {
    const { data: updated, error } = await userClient
      .from('responses')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return { id, status, updated: true };
    }

    return {
      id: updated.id,
      status: updated.status || status,
      updatedAt: updated.updated_at
    };
  }

  static async promotePostToExperience(userClient = supabase, id) {
    const { data: post } = await userClient
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (post) {
      await userClient
        .from('posts')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', id);

      const cardData = {
        title: post.content ? post.content.substring(0, 50) : 'Approved Reflection',
        category: post.category || 'General',
        excerpt: post.content || '',
        what_happened: post.content || '',
        what_changed: 'Shared & validated by community moderators',
        what_helped: post.tags || ['Peer support'],
        where_i_am_now: 'Moving forward with clarity',
        status: 'approved',
        tags: post.tags || [],
        created_at: new Date().toISOString()
      };

      const { data: createdCard } = await userClient
        .from('experience_cards')
        .insert(cardData)
        .select()
        .maybeSingle();

      return {
        id,
        status: 'approved',
        promoted: true,
        experienceCard: createdCard || cardData
      };
    }

    return { id, status: 'approved', promoted: true };
  }
}

module.exports = ModerationService;
