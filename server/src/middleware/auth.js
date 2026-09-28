const { verifyAccessToken } = require('../utils/jwt');
const { ApiError } = require('../utils/response');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token required', null, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User no longer exists', null, 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired', null, 'TOKEN_EXPIRED'));
    }
    return next(new ApiError(401, 'Invalid authentication token', null, 'INVALID_TOKEN'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', null, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied: insufficient permissions', null, 'FORBIDDEN'));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
