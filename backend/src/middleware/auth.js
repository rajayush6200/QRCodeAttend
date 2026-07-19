const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ApiError } = require('../utils/ApiError');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Verifies the JWT access token from Authorization header.
 * Attaches req.user and req.token on success.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Please provide a valid Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Token missing from Authorization header.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Access token has expired. Please refresh your session.');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'Invalid access token.');
      }
      throw new ApiError(401, 'Token verification failed.');
    }

    const user = await User.findById(decoded.userId).select('+deviceFingerprints').lean();
    if (!user) {
      throw new ApiError(401, 'User associated with this token no longer exists.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact admin.');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Generates a signed JWT access token (short-lived).
 */
const generateAccessToken = (userId, role, institutionId) => {
  return jwt.sign(
    { userId, role, institutionId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generates a signed JWT refresh token (long-lived).
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Verifies a refresh token and returns the decoded payload.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  authenticate,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
