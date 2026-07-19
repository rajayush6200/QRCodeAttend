const rateLimit = require('express-rate-limit');
const { ApiResponse } = require('../utils/ApiResponse');

const createLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    },
    handler: (req, res) => {
      res.status(429).json(
        ApiResponse.error(
          `Too many requests. Please try again after ${Math.ceil(options.windowMs / 60000)} minute(s).`,
          429
        )
      );
    },
    skip: (req) => {
      // Skip rate limiting in test environment
      return process.env.NODE_ENV === 'test';
    },
  });
};

// Global rate limiter: 200 requests per 15 minutes per user/IP
const globalRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

// Strict limiter for auth endpoints: 10 attempts per 15 minutes
const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

// QR scan limiter: 30 attempts per minute (prevent brute force)
const qrScanRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
});

// Export limiter: 5 exports per minute
const exportRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  qrScanRateLimiter,
  exportRateLimiter,
};
