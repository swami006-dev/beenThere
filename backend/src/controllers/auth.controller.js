const AuthService = require('../services/auth.service');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');
const { successResponse } = require('../utils/apiResponse');

class AuthController {
  static async register(req, res, next) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);
      return successResponse(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      const result = await AuthService.getMe(req.user, req.token);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { nickname, academicContext } = req.body;
      let validatedNickname = undefined;
      if (nickname !== undefined && nickname !== null && nickname !== '') {
        const { nicknameSchema } = require('../schemas/auth.schema');
        validatedNickname = nicknameSchema.parse(nickname);
      }
      const { createUserClient } = require('../db/supabase');
      const userClient = createUserClient(req.token);
      const result = await AuthService.updateProfile(userClient, req.user, { nickname: validatedNickname, academicContext });
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
