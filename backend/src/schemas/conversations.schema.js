const { z } = require('zod');

const createRequestSchema = z.object({
  experiencePostId: z.string({ required_error: 'Experience post ID is required' }).min(1, 'Experience post ID is required'),
  targetAnonymousProfileId: z.string().optional().nullable(),
  message: z.string().transform(v => (v ? v.trim().replace(/\s+/g, ' ') : '')).optional()
});

const sendMessageSchema = z.object({
  content: z.string({ required_error: 'Message content is required' })
    .transform(v => (v ? v.trim().replace(/\s+/g, ' ') : ''))
    .refine(v => v.length >= 1, { message: 'Message content cannot be empty' })
    .refine(v => v.length <= 1000, { message: 'Message content cannot exceed 1000 characters' })
});

const respondRequestSchema = z.object({
  status: z.enum(['accepted', 'declined'], { required_error: 'Status must be accepted or declined' })
});

const reportSchema = z.object({
  reason: z.enum([
    'Harassment',
    'Inappropriate content',
    'Spam',
    'Asking for personal information',
    'Threatening behavior',
    'Self-harm / safety concern',
    'Other'
  ], { required_error: 'Report reason is required' }),
  details: z.string().transform(v => (v ? v.trim().replace(/\s+/g, ' ') : '')).optional()
});

module.exports = {
  createRequestSchema,
  sendMessageSchema,
  respondRequestSchema,
  reportSchema
};
