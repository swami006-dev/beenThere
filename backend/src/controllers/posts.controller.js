const PostsService = require('../services/posts.service');
const { createPostSchema, updatePostSchema } = require('../schemas/posts.schema');
const { successResponse } = require('../utils/apiResponse');

class PostsController {
  static async listMyPosts(req, res, next) {
    try {
      const posts = await PostsService.listMyPosts(req.supabase, req.user);
      return successResponse(res, posts, 200);
    } catch (err) {
      next(err);
    }
  }

  static async listPosts(req, res, next) {
    try {
      if (req.query.mine === 'true' && req.user) {
        const posts = await PostsService.listMyPosts(req.supabase, req.user);
        return successResponse(res, posts, 200);
      }
      const posts = await PostsService.listApprovedPosts(req.supabase);
      return successResponse(res, posts, 200);
    } catch (err) {
      next(err);
    }
  }

  static async getPost(req, res, next) {
    try {
      const post = await PostsService.getPostById(req.supabase, req.params.id);
      return successResponse(res, post, 200);
    } catch (err) {
      next(err);
    }
  }

  static async createPost(req, res, next) {
    try {
      const validated = createPostSchema.parse(req.body);
      const post = await PostsService.createPost(req.supabase, req.user, validated);
      return successResponse(res, post, 201);
    } catch (err) {
      next(err);
    }
  }

  static async updatePost(req, res, next) {
    try {
      const validated = updatePostSchema.parse(req.body);
      const post = await PostsService.updatePost(req.supabase, req.user, req.params.id, validated);
      return successResponse(res, post, 200);
    } catch (err) {
      next(err);
    }
  }

  static async deletePost(req, res, next) {
    try {
      const result = await PostsService.deletePost(req.supabase, req.user, req.params.id);
      return successResponse(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PostsController;
