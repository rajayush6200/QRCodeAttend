const { validationResult } = require('express-validator');
const { ApiResponse } = require('../utils/ApiResponse');

/**
 * Middleware to run after express-validator chains.
 * Collects all validation errors and returns a 422 response.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(422).json(
      ApiResponse.error('Input validation failed.', 422, formattedErrors)
    );
  }
  next();
};

module.exports = { validate };
