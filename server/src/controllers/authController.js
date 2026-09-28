const { z } = require('zod');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { ApiResponse, ApiError } = require('../utils/response');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const register = async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validated.email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists', null, 'USER_EXISTS');
    }

    const passwordHash = await User.hashPassword(validated.password);

    const user = await User.create({
      name: validated.name,
      email: validated.email.toLowerCase(),
      passwordHash,
      role: validated.role || 'USER',
    });

    const tokens = generateTokens(user);

    return ApiResponse.success(
      res,
      {
        user: user.toJSON(),
        tokens,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validated.email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password', null, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password', null, 'INVALID_CREDENTIALS');
    }

    const tokens = generateTokens(user);

    return ApiResponse.success(
      res,
      {
        user: user.toJSON(),
        tokens,
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    return ApiResponse.success(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    return ApiResponse.success(res, { user: req.user.toJSON() }, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      throw new ApiError(400, 'Refresh token required', null, 'TOKEN_REQUIRED');
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User no longer exists', null, 'UNAUTHORIZED');
    }

    const tokens = generateTokens(user);
    return ApiResponse.success(res, { tokens }, 'Tokens refreshed successfully');
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, 'Invalid or expired refresh token', null, 'INVALID_TOKEN'));
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  refreshToken,
};
