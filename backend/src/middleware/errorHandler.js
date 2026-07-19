const logger = require('../utils/logger');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

/**
 * Global 404 handler — catches unmatched routes.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json(
    ApiResponse.error(`Route ${req.method} ${req.originalUrl} not found.`, 404)
  );
};

/**
 * Global error handler — catches all errors thrown in the application.
 * Must be registered as the last middleware with 4 arguments.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log the error
  if (error.statusCode >= 500) {
    console.error('SERVER ERROR 500:', err.stack);
    logger.error(`[${req.method}] ${req.originalUrl} — ${error.statusCode}`, {
      message: error.message,
      stack: err.stack,
      user: req.user?._id,
      ip: req.ip,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} — ${error.statusCode}: ${error.message}`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json(
      ApiResponse.error('Validation failed.', 400, messages)
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(409).json(
      ApiResponse.error(`Duplicate value: '${value}' already exists for field '${field}'.`, 409)
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json(
      ApiResponse.error(`Invalid value for field '${err.path}': ${err.value}`, 400)
    );
  }

  // Express validator errors
  if (err.type === 'VALIDATION_ERROR') {
    return res.status(422).json(
      ApiResponse.error('Input validation failed.', 422, err.errors)
    );
  }

  // Known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(
      ApiResponse.error(err.message, err.statusCode, err.errors)
    );
  }

  // Generic server error (hide details in production)
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error.' : error.message;

  res.status(error.statusCode).json(ApiResponse.error(message, error.statusCode));
};

module.exports = { errorHandler, notFoundHandler };
