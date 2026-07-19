/**
 * Standardized API response wrapper.
 * All endpoints return one of these shapes for consistency.
 */
class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
    this.timestamp = new Date().toISOString();
  }

  static success(message = 'Success', data = null, statusCode = 200) {
    return new ApiResponse(statusCode, message, data);
  }

  static error(message = 'An error occurred.', statusCode = 500, errors = null) {
    const response = new ApiResponse(statusCode, message);
    if (errors) {
      response.errors = errors;
    }
    return response;
  }

  static paginated(message, data, pagination) {
    const response = new ApiResponse(200, message, data);
    response.pagination = pagination;
    return response;
  }
}

module.exports = { ApiResponse };
