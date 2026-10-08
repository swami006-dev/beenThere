const { z } = require('zod');

const createExperienceSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional().default('General'),
  excerpt: z.string().min(1, 'Excerpt is required').max(2000),
  whatHappened: z.string().optional(),
  whatChanged: z.string().optional(),
  whatHelped: z.array(z.string()).optional().default([]),
  whereIAmNow: z.string().optional(),
  tags: z.array(z.string()).optional().default([])
});

const updateExperienceSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'archived']).optional(),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  category: z.string().optional()
});

module.exports = {
  createExperienceSchema,
  updateExperienceSchema
};
