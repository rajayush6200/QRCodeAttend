const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Factory: creates an audit-log middleware for a specific action.
 *
 * Usage in routes:
 *   router.post('/users', authenticate, auditLog('USER_CREATED', 'User'), createUser);
 *
 * @param {string} action - The action being performed (e.g. 'SESSION_STARTED')
 * @param {string} resourceType - The type of resource (e.g. 'Session')
 * @param {Function} [getResourceId] - Optional fn(req, res) => ObjectId
 */
const auditLog = (action, resourceType, getResourceId = null) => {
  return async (req, res, next) => {
    // Capture the original json method to intercept the response
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Only log successful mutations (2xx responses)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const resourceId = getResourceId
            ? getResourceId(req, body)
            : (body?.data?._id || body?.data?.id || null);

          await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action,
            resourceType,
            resourceId,
            metadata: {
              method: req.method,
              path: req.originalUrl,
              body: sanitizeBody(req.body),
              params: req.params,
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            institutionId: req.user.institutionId,
            severity: getSeverity(action),
          });
        } catch (err) {
          // Audit logging failure should NOT break the request
          logger.error('Audit log write failed:', err.message);
        }
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware to log all incoming requests (lightweight, non-blocking).
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} — ${duration}ms`);
  });
  next();
};

// Sanitize sensitive fields from request body before logging
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return {};
  const sensitive = ['password', 'passwordHash', 'token', 'secret', 'refreshToken'];
  const sanitized = { ...body };
  sensitive.forEach((field) => {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
};

const getSeverity = (action) => {
  const critical = ['USER_DELETED', 'INSTITUTION_DELETED', 'ADMIN_ACTION', 'PASSWORD_RESET'];
  const warning = ['SESSION_CANCELLED', 'ATTENDANCE_OVERRIDE', 'USER_DEACTIVATED'];
  if (critical.some((a) => action.includes(a))) return 'critical';
  if (warning.some((a) => action.includes(a))) return 'warning';
  return 'info';
};

module.exports = { auditLog, requestLogger };
