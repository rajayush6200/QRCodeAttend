const crypto = require('crypto');

/**
 * Generate a secure random token (hex string).
 * @param {number} bytes - Number of random bytes (default 32)
 */
const generateToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a plain token for secure DB storage.
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Parse pagination params from request query.
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build a paginated response metadata object.
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});

/**
 * Extract client IP from request (handles proxies).
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip
  );
};

/**
 * Format a date to a readable string.
 */
const formatDate = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Calculate percentage safely.
 */
const calcPercentage = (part, total, decimals = 1) => {
  if (!total || total === 0) return 0;
  return parseFloat(((part / total) * 100).toFixed(decimals));
};

/**
 * Deep pick specific keys from an object.
 */
const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

/**
 * Delay utility for testing/dev.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validates a MongoDB ObjectId string format.
 */
const isValidObjectId = (id) => {
  return /^[a-fA-F0-9]{24}$/.test(id);
};

module.exports = {
  generateToken,
  hashToken,
  parsePagination,
  buildPaginationMeta,
  getClientIp,
  formatDate,
  calcPercentage,
  pick,
  delay,
  isValidObjectId,
};
