const crypto = require('crypto');

/**
 * Device Fingerprint Service
 *
 * Server-side: validates and normalizes device fingerprints submitted by clients.
 * Client-side fingerprinting uses Canvas API, WebGL renderer, User-Agent,
 * screen resolution, timezone, and language (see frontend/src/utils/deviceFingerprint.js).
 *
 * Server validates:
 * 1. Fingerprint is a non-empty string
 * 2. Fingerprint passes format validation (hex hash)
 * 3. Same fingerprint hasn't marked attendance in this session (proxy check)
 */

const FINGERPRINT_REGEX = /^[a-f0-9]{32,128}$/i;

/**
 * Validate the structure and format of a device fingerprint.
 * @param {string} fingerprint
 * @returns {{ isValid: boolean, reason?: string }}
 */
const validateFingerprint = (fingerprint) => {
  if (!fingerprint || typeof fingerprint !== 'string') {
    return { isValid: false, reason: 'Device fingerprint is missing.' };
  }

  const normalized = fingerprint.trim().toLowerCase();

  if (!FINGERPRINT_REGEX.test(normalized)) {
    return { isValid: false, reason: 'Device fingerprint format is invalid.' };
  }

  if (normalized.length < 32) {
    return { isValid: false, reason: 'Device fingerprint is too short.' };
  }

  return { isValid: true, normalized };
};

/**
 * Hash a fingerprint for consistent comparison and storage.
 * This prevents raw fingerprints from being stored and compared directly.
 * @param {string} fingerprint - Raw client-submitted fingerprint
 * @param {string} sessionId - Salted with session ID to prevent cross-session tracking
 * @returns {string} - SHA-256 hash
 */
const hashFingerprint = (fingerprint, sessionId) => {
  const salt = process.env.FINGERPRINT_SALT || 'qrcodeattend_fp_salt';
  return crypto
    .createHash('sha256')
    .update(`${fingerprint}:${sessionId}:${salt}`)
    .digest('hex');
};

/**
 * Check if a device fingerprint has already been used in a session.
 * Queries the Attendance model.
 *
 * @param {string} hashedFingerprint - SHA-256 hashed fingerprint
 * @param {string} sessionId - Session ObjectId
 * @param {object} AttendanceModel - Mongoose Attendance model
 * @returns {Promise<{ isDuplicate: boolean, existingRecord?: object }>}
 */
const checkDuplicateDevice = async (hashedFingerprint, sessionId, AttendanceModel) => {
  const existing = await AttendanceModel.findOne({
    sessionId,
    deviceFingerprint: hashedFingerprint,
  }).lean();

  return {
    isDuplicate: !!existing,
    existingRecord: existing || null,
  };
};

module.exports = { validateFingerprint, hashFingerprint, checkDuplicateDevice };
