const { errorResponse } = require('../utils/apiResponse');

function notFoundHandler(req, res, next) {
  return errorResponse(
    res,
    'NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );
}

module.exports = {
  notFoundHandler
};
