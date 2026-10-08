const { z } = require('zod');

const createResponseSchema = z.object({
  postId: z.string().min(1, 'postId is required'),
  content: z.string().min(1, 'Response content cannot be empty').max(3000, 'Response too long')
});

const updateResponseSchema = z.object({
  content: z.string().min(1, 'Response content cannot be empty').max(3000, 'Response too long')
});

module.exports = {
  createResponseSchema,
  updateResponseSchema
};
