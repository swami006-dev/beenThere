const ReactionsService = require('../services/reactions.service');
const { successResponse } = require('../utils/apiResponse');

class ReactionsController {
  static async getReactions(req, res, next) {
    try {
      const { postId } = req.params;
      const result = await ReactionsService.getPostReactions(req.userClient, req.user, postId);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async toggleReaction(req, res, next) {
    try {
      const { postId } = req.params;
      const { reactionType } = req.body || {};
      const result = await ReactionsService.toggleReaction(req.userClient, req.user, postId, reactionType);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReactionsController;
