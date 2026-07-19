const QRCode = require('qrcode');
const { totp } = require('otplib');
const { ApiError } = require('../utils/ApiError');

/**
 * QR Service — Handles rotating TOTP-based QR code generation.
 *
 * Each session has a unique secret. The QR payload includes:
 * - sessionId
 * - TOTP token (time-based, rotates every `rotationInterval` seconds)
 * - timestamp
 *
 * The QR encodes a JSON payload as a base64 string.
 */

/**
 * Generate the current QR payload for a session.
 * @param {import('../models/Session')} session - Session document (must have qrSecret)
 * @returns {{ payload: string, token: string, expiresIn: number, qrDataUrl: string }}
 */
const generateQrPayload = async (session) => {
  if (!session.qrSecret) {
    throw new ApiError(500, 'Session QR secret not initialized.');
  }

  const token = session.getCurrentQrToken();
  const expiresIn = session.getQrSecondsRemaining();

  const payload = Buffer.from(
    JSON.stringify({
      sid: session._id.toString(),
      tok: token,
      ts: Math.floor(Date.now() / 1000),
    })
  ).toString('base64');

  // Generate QR as a data URL (PNG, embedded in base64)
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.9,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: 400,
  });

  return {
    payload,
    token,
    expiresIn,
    qrDataUrl,
    rotationInterval: session.qrRotationInterval,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Decode and verify a QR payload submitted by a student.
 * @param {string} encodedPayload - Base64 encoded QR payload
 * @param {import('../models/Session')} session - Active session document
 * @returns {{ isValid: boolean, sessionId: string, reason?: string }}
 */
const verifyQrPayload = (encodedPayload, session) => {
  try {
    if (!encodedPayload || typeof encodedPayload !== 'string') {
      return { isValid: false, reason: 'Invalid QR payload format.' };
    }

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8'));
    } catch {
      return { isValid: false, reason: 'QR payload could not be decoded.' };
    }

    const { sid, tok, ts } = decoded;

    // Validate session ID matches
    if (sid !== session._id.toString()) {
      return { isValid: false, reason: 'QR code is not for this session.' };
    }

    // Check payload age (reject if older than 2x rotation interval + 10s buffer)
    const maxAge = session.qrRotationInterval * 2 + 10;
    if (Math.floor(Date.now() / 1000) - ts > maxAge) {
      return { isValid: false, reason: 'QR code has expired. Please scan the latest code.' };
    }

    // Verify TOTP token
    const isTokenValid = session.verifyQrToken(tok);
    if (!isTokenValid) {
      return { isValid: false, reason: 'QR token is invalid or expired. Please scan the fresh code.' };
    }

    return { isValid: true, sessionId: sid };
  } catch (err) {
    return { isValid: false, reason: 'QR verification failed.' };
  }
};

module.exports = { generateQrPayload, verifyQrPayload };
