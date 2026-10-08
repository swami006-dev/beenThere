const AiService = require('../services/ai.service');
const { analyzeInputSchema, matchInputSchema, extractExperienceInputSchema } = require('../schemas/ai.schema');
const { successResponse } = require('../utils/apiResponse');

class AiController {
  static async analyze(req, res, next) {
    try {
      const validated = analyzeInputSchema.parse(req.body);
      const result = await AiService.analyzeReflection({
        content: validated.content,
        categoryHint: validated.categoryHint || validated.topic,
        topic: validated.topic
      });
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async match(req, res, next) {
    try {
      const validated = matchInputSchema.parse(req.body);
      const result = await AiService.matchExperiences({
        content: validated.content,
        category: validated.category,
        tags: validated.tags,
        excludePostId: validated.excludePostId,
        topK: validated.topK || 5,
        userClient: req.userClient
      });
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async extractExperience(req, res, next) {
    try {
      const validated = extractExperienceInputSchema.parse(req.body);
      const result = await AiService.extractExperience(validated);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AiController;
