const { ApiError, ApiResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return ApiResponse.error(res, 'Validation Error', 400, 'VALIDATION_ERROR', details);
  }

  // Handle Mongoose Duplicate Key Errors
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {});
    return ApiResponse.error(res, `Duplicate key error on field(s): ${keys.join(', ')}`, 409, 'DUPLICATE_KEY', err.keyValue);
  }

  // Handle Zod Validation Errors
  if (err.name === 'ZodError') {
    const details = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return ApiResponse.error(res, 'Invalid request data', 400, 'INVALID_INPUT', details);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  return ApiResponse.error(res, message, statusCode, 'INTERNAL_SERVER_ERROR', err.stack);
};

module.exports = errorHandler;
