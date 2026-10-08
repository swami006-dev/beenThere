const { z } = require('zod');

const CANONICAL_CATEGORIES = [
  'Academic',
  'Career',
  'College Life',
  'Social / Communication',
  'Relationships',
  'Mental Wellbeing',
  'Other'
];

const SAFETY_FLAG_TYPES = [
  'harassment',
  'threat',
  'dangerous_advice',
  'self_harm_signal',
  'personal_information',
  'urgent_safety_concern'
];

// Request body validation schema for /api/ai/analyze
const analyzeInputSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  categoryHint: z.string().optional(),
  topic: z.string().optional()
});

// Request body validation schema for /api/ai/match
const matchInputSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  topK: z.number().optional().default(5)
});

// LangChain structured output schema for student reflection analysis
const aiAnalysisSchema = z.object({
  category: z
    .enum(CANONICAL_CATEGORIES)
    .describe('Must be one of: Academic, Career, College Life, Social / Communication, Relationships, Mental Wellbeing, Other'),
  situation: z
    .string()
    .describe('One concise sentence summarizing what the student is going through'),
  need: z
    .string()
    .describe('Short description of what practical support or perspective the student seeks'),
  context: z
    .string()
    .describe('Brief academic or life context e.g. College coding assessments'),
  tags: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('2 to 5 relevant short tags without hash symbols'),
  risk: z
    .enum(['low', 'medium', 'high'])
    .describe('Safety risk classification: low (ordinary hardship), medium (concerning distress), high (urgent safety or self-harm concern)'),
  flags: z
    .array(z.string())
    .describe('List of detected safety flags if any, e.g. harassment, threat, dangerous_advice, self_harm_signal, personal_information, urgent_safety_concern'),
  requires_human_review: z
    .boolean()
    .describe('True if content contains severe risk or safety flags requiring human moderator review')
});

// Request body validation schema for /api/ai/extract-experience
const extractExperienceInputSchema = z.object({
  content: z.string().optional(),
  responses: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// LangChain structured output schema for Experience Card extraction
const extractExperienceSchema = z.object({
  situation: z
    .string()
    .describe('Concise summary of the situation described in the real student discussion'),
  whatTheyTried: z
    .string()
    .describe('Summary of actions or coping strategies attempted, or "Not specified" if unknown'),
  whatHelped: z
    .string()
    .describe('Summary of what was helpful or provided relief, or "Not specified" if unknown'),
  outcome: z
    .string()
    .describe('Summary of the outcome or current state, or "Not specified" if unknown'),
  tags: z
    .array(z.string())
    .describe('2 to 5 relevant tags')
});

module.exports = {
  CANONICAL_CATEGORIES,
  SAFETY_FLAG_TYPES,
  analyzeInputSchema,
  matchInputSchema,
  aiAnalysisSchema,
  extractExperienceInputSchema,
  extractExperienceSchema
};
