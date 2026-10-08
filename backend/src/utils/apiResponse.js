/**
 * Standardized API response helpers
 */

function successResponse(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

function errorResponse(res, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}

module.exports = {
  successResponse,
  errorResponse
};
