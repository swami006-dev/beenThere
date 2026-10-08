const ModerationService = require('../services/moderation.service');
const { successResponse } = require('../utils/apiResponse');

class ModerationController {
  static async listReports(req, res, next) {
    try {
      const reports = await ModerationService.listReports(req.supabase);
      return successResponse(res, reports, 200);
    } catch (err) {
      next(err);
    }
  }

  static async moderatePost(req, res, next) {
    try {
      const { status } = req.body;
      const result = await ModerationService.moderatePost(req.supabase, req.params.id, { status: status || 'approved' });
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async moderateResponse(req, res, next) {
    try {
      const { status } = req.body;
      const result = await ModerationService.moderateResponse(req.supabase, req.params.id, { status: status || 'approved' });
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async promotePost(req, res, next) {
    try {
      const result = await ModerationService.promotePostToExperience(req.supabase, req.params.id);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ModerationController;
