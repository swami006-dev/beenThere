const { z } = require('zod');

const BAD_WORDS = ['admin', 'moderator', 'system', 'root', 'support', 'beenthere', 'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'bastard'];

const nicknameSchema = z.string({
  required_error: 'Nickname is required',
  invalid_type_error: 'Nickname must be a string'
})
  .transform((val) => val.trim().replace(/\s+/g, ' '))
  .refine((val) => val.length >= 2, { message: 'Nickname must be at least 2 characters long' })
  .refine((val) => val.length <= 24, { message: 'Nickname must be at most 24 characters long' })
  .refine((val) => !/@/.test(val), { message: 'Nickname cannot be or contain an email address' })
  .refine((val) => !/(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|org|net|io|edu|gov|co|app))/i.test(val), { message: 'Nickname cannot contain web links or URLs' })
  .refine((val) => !(/(\+?\d[\d\s-]{6,}\d|\d{7,})/.test(val)), { message: 'Nickname cannot contain phone numbers' })
  .refine((val) => {
    const lower = val.toLowerCase();
    return !BAD_WORDS.some(word => lower.includes(word));
  }, { message: 'Nickname contains inappropriate or restricted terms' });

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  chosenIdentity: nicknameSchema.optional().or(z.literal('')),
  academicContext: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const updateNicknameSchema = z.object({
  nickname: nicknameSchema
});

module.exports = {
  nicknameSchema,
  registerSchema,
  loginSchema,
  updateNicknameSchema
};

