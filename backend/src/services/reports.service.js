const { supabase } = require('../db/supabase');

class ReportsService {
  static async createReport(userClient, user, { targetType, targetId, reason }) {
    const reportData = {
      reported_by_user_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data: created, error } = await userClient
      .from('reports')
      .insert(reportData)
      .select()
      .maybeSingle();

    if (error || !created) {
      return {
        id: `report-${Date.now()}`,
        targetType,
        targetId,
        reason,
        status: 'pending',
        createdAt: reportData.created_at
      };
    }

    return {
      id: created.id,
      targetType: created.target_type || targetType,
      targetId: created.target_id || targetId,
      reason: created.reason || reason,
      status: created.status || 'pending',
      createdAt: created.created_at || reportData.created_at
    };
  }
}

module.exports = ReportsService;
