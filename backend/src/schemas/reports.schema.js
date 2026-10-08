const { z } = require('zod');

const createReportSchema = z.object({
  targetType: z.enum(['post', 'response'], { message: "targetType must be 'post' or 'response'" }),
  targetId: z.string().min(1, 'targetId is required'),
  reason: z.string().min(1, 'Report reason cannot be empty').max(1000, 'Reason too long')
});

module.exports = {
  createReportSchema
};
