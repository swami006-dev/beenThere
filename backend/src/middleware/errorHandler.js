const { ZodError } = require('zod');
const { AppError } = require('../utils/errors');
const { errorResponse } = require('../utils/apiResponse');
const { env } = require('../config/env');

function errorHandler(err, req, res, next) {
  // If response headers are already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle syntax error from express.json body parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'INVALID_JSON', 'Malformed JSON payload in request body', 400);
  }

  // Handle payload too large
  if (err.type === 'entity.too.large') {
    return errorResponse(res, 'PAYLOAD_TOO_LARGE', 'Request payload exceeds maximum allowed size', 413);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') || 'Validation error';
    return errorResponse(res, 'VALIDATION_ERROR', message, 400);
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return errorResponse(res, err.code, err.message, err.statusCode);
  }

  // Log unexpected errors only in development/test or minimal message in production
  if (env.NODE_ENV !== 'production') {
    console.error('Unhandled Server Error:', err);
  } else {
    console.error('Unhandled Server Error:', err.message);
  }

  // Generic 500 internal server error
  return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'An unexpected internal server error occurred', 500);
}

module.exports = {
  errorHandler
};
