const ReportsService = require('../services/reports.service');
const { createReportSchema } = require('../schemas/reports.schema');
const { successResponse } = require('../utils/apiResponse');

class ReportsController {
  static async createReport(req, res, next) {
    try {
      const validated = createReportSchema.parse(req.body);
      const report = await ReportsService.createReport(req.supabase, req.user, validated);
      return successResponse(res, report, 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportsController;
