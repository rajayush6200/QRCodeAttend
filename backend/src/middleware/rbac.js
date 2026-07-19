const { ApiError } = require('../utils/ApiError');

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Usage: authorize('admin', 'faculty')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. This endpoint requires one of: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}.`
        )
      );
    }

    next();
  };
};

/**
 * Ensures the user belongs to the institution they're accessing.
 * Reads institutionId from params, body, or query.
 */
const requireSameInstitution = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  // Admins can only access their own institution
  const targetInstitutionId =
    req.params.institutionId ||
    req.body.institutionId ||
    req.query.institutionId;

  if (targetInstitutionId && req.user.role !== 'admin') {
    const userInst = req.user.institutionId?.toString();
    if (userInst !== targetInstitutionId) {
      return next(new ApiError(403, 'Access denied. Cross-institution access is not permitted.'));
    }
  }

  next();
};

/**
 * Allows an admin to bypass institution checks,
 * but faculty/students are restricted to their institution.
 */
const restrictToInstitution = (req, res, next) => {
  if (req.user?.role === 'admin') {
    // Inject institution scope automatically
    req.institutionScope = req.user.institutionId;
  } else if (req.user) {
    req.institutionScope = req.user.institutionId;
  }
  next();
};

module.exports = { authorize, requireSameInstitution, restrictToInstitution };
