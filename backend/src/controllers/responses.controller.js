const ResponsesService = require('../services/responses.service');
const { createResponseSchema, updateResponseSchema } = require('../schemas/responses.schema');
const { successResponse } = require('../utils/apiResponse');

class ResponsesController {
  static async listResponses(req, res, next) {
    try {
      const postId = req.query.postId;
      const responses = await ResponsesService.listResponses(req.supabase, postId);
      return successResponse(res, responses, 200);
    } catch (err) {
      next(err);
    }
  }

  static async createResponse(req, res, next) {
    try {
      const validated = createResponseSchema.parse(req.body);
      const response = await ResponsesService.createResponse(req.supabase, req.user, validated);
      return successResponse(res, response, 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateResponse(req, res, next) {
    try {
      const validated = updateResponseSchema.parse(req.body);
      const response = await ResponsesService.updateResponse(req.supabase, req.user, req.params.id, validated);
      return successResponse(res, response, 200);
    } catch (err) {
      next(err);
    }
  }

  static async deleteResponse(req, res, next) {
    try {
      const result = await ResponsesService.deleteResponse(req.supabase, req.user, req.params.id);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ResponsesController;
