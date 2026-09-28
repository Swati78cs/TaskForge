class ApiError extends Error {
  constructor(statusCode, message, details = null, code = 'GENERIC_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    const response = {
      success: false,
      error: {
        code,
        message,
      },
    };
    if (details && process.env.NODE_ENV !== 'production') {
      response.error.details = details;
    }
    return res.status(statusCode).json(response);
  }
}

module.exports = { ApiError, ApiResponse };
