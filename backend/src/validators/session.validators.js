const { body } = require('express-validator');

const sessionValidators = [
  body('courseId')
    .notEmpty().withMessage('Course ID is required.')
    .isMongoId().withMessage('Invalid course ID format.'),
  body('title')
    .trim()
    .notEmpty().withMessage('Session title is required.')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters.'),
  body('scheduledAt')
    .notEmpty().withMessage('Scheduled date/time is required.')
    .isISO8601().withMessage('Invalid date format. Use ISO 8601.'),
  body('geoLocation.lat')
    .notEmpty().withMessage('Location latitude is required.')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),
  body('geoLocation.lng')
    .notEmpty().withMessage('Location longitude is required.')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
  body('geoLocation.radius')
    .optional()
    .isInt({ min: 10, max: 500 }).withMessage('Geo-fence radius must be between 10 and 500 meters.'),
  body('qrRotationInterval')
    .optional()
    .isInt({ min: 15, max: 120 }).withMessage('QR rotation interval must be 15–120 seconds.'),
  body('attendanceWindow.openAt')
    .optional()
    .isISO8601().withMessage('Invalid window open time.'),
  body('attendanceWindow.closeAt')
    .optional()
    .isISO8601().withMessage('Invalid window close time.'),
];

module.exports = { sessionValidators };
