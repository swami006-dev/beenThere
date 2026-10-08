const ExperiencesService = require('../services/experiences.service');
const { createExperienceSchema, updateExperienceSchema } = require('../schemas/experiences.schema');
const { successResponse } = require('../utils/apiResponse');

class ExperiencesController {
  static async listExperiences(req, res, next) {
    try {
      const cards = await ExperiencesService.listApprovedExperiences(req.supabase);
      return successResponse(res, cards, 200);
    } catch (err) {
      next(err);
    }
  }

  static async getExperience(req, res, next) {
    try {
      const card = await ExperiencesService.getExperienceById(req.supabase, req.params.id);
      return successResponse(res, card, 200);
    } catch (err) {
      next(err);
    }
  }

  static async createExperience(req, res, next) {
    try {
      const validated = createExperienceSchema.parse(req.body);
      const card = await ExperiencesService.createExperience(req.supabase, req.user, validated);
      return successResponse(res, card, 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateExperience(req, res, next) {
    try {
      const validated = updateExperienceSchema.parse(req.body);
      const card = await ExperiencesService.updateExperienceStatus(req.supabase, req.params.id, validated);
      return successResponse(res, card, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ExperiencesController;
