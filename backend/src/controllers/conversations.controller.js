const ConversationsService = require('../services/conversations.service');
const {
  createRequestSchema,
  sendMessageSchema,
  respondRequestSchema,
  reportSchema
} = require('../schemas/conversations.schema');
const { successResponse } = require('../utils/apiResponse');
const { createUserClient } = require('../db/supabase');

class ConversationsController {
  static async createRequest(req, res, next) {
    try {
      const validated = createRequestSchema.parse(req.body);
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.createRequest(userClient, req.user, validated);
      return successResponse(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  static async listRequests(req, res, next) {
    try {
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.listUserRequests(userClient, req.user);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async respondRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const { status } = respondRequestSchema.parse(req.body);
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.respondToRequest(userClient, req.user, requestId, status);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async listConversations(req, res, next) {
    try {
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.listUserConversations(userClient, req.user);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async getConversation(req, res, next) {
    try {
      const { id } = req.params;
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.getConversationDetails(userClient, req.user, id);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async sendMessage(req, res, next) {
    try {
      const { id } = req.params;
      const { content } = sendMessageSchema.parse(req.body);
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.sendMessage(userClient, req.user, id, content);
      return successResponse(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  static async endConversation(req, res, next) {
    try {
      const { id } = req.params;
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.endConversation(userClient, req.user, id);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async blockUser(req, res, next) {
    try {
      const { id } = req.params;
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.blockUserInConversation(userClient, req.user, id);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async reportUser(req, res, next) {
    try {
      const { id } = req.params;
      const validated = reportSchema.parse(req.body);
      const userClient = createUserClient(req.token);
      const result = await ConversationsService.reportUserInConversation(userClient, req.user, id, validated);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ConversationsController;
