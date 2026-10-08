const SavedService = require('../services/saved.service');
const { successResponse } = require('../utils/apiResponse');

class SavedController {
  static async listSaved(req, res, next) {
    try {
      const result = await SavedService.listSaved(req.userClient, req.user);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async saveItem(req, res, next) {
    try {
      const { itemId, itemType } = req.body;
      const result = await SavedService.saveItem(req.userClient, req.user, { itemId, itemType });
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async unsaveItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const result = await SavedService.unsaveItem(req.userClient, req.user, itemId);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SavedController;
