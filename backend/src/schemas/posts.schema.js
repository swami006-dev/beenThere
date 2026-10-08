const { z } = require('zod');

const createPostSchema = z.object({
  content: z.string().min(1, 'Post content cannot be empty').max(5000, 'Post content too long'),
  category: z.string().optional().default('General'),
  tags: z.array(z.string()).optional().default([])
});

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
});

module.exports = {
  createPostSchema,
  updatePostSchema
};
