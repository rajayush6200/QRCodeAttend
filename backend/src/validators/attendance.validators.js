const { body } = require('express-validator');

const attendanceValidators = [
  body('qrPayload')
    .notEmpty().withMessage('QR payload is required.')
    .isBase64().withMessage('QR payload must be a valid base64 string.'),
  body('deviceFingerprint')
    .notEmpty().withMessage('Device fingerprint is required.')
    .isLength({ min: 32, max: 256 }).withMessage('Invalid device fingerprint length.'),
  body('geoLocation.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),
  body('geoLocation.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
  body('geoLocation.accuracy')
    .optional()
    .isFloat({ min: 0 }).withMessage('GPS accuracy must be a positive number.'),
];

module.exports = { attendanceValidators };
