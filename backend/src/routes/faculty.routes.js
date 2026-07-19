const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLogger');
const { exportRateLimiter } = require('../middleware/rateLimiter');
const {
  getMyCourses,
  getSessions, getSessionById, createSession, startSession, endSession,
  cancelSession, getSessionQr, getSessionAttendance, overrideAttendance,
  exportSessionPdf, exportSessionExcel,
  getFacultyAnalytics,
} = require('../controllers/faculty.controller');
const { sessionValidators } = require('../validators/session.validators');

router.use(authenticate, authorize('faculty', 'admin'));

// Courses
router.get('/courses', getMyCourses);

// Sessions
router.get('/sessions', getSessions);
router.post('/sessions', sessionValidators, validate, auditLog('SESSION_CREATED', 'Session'), createSession);
router.get('/sessions/:id', getSessionById);
router.patch('/sessions/:id/start', auditLog('SESSION_STARTED', 'Session'), startSession);
router.patch('/sessions/:id/end', auditLog('SESSION_ENDED', 'Session'), endSession);
router.patch('/sessions/:id/cancel', auditLog('SESSION_CANCELLED', 'Session'), cancelSession);
router.get('/sessions/:id/qr', getSessionQr);
router.get('/sessions/:id/attendance', getSessionAttendance);
router.patch('/sessions/:id/attendance/override', auditLog('ATTENDANCE_OVERRIDE', 'Attendance'), overrideAttendance);

// Export
router.get('/sessions/:id/export/pdf', exportRateLimiter, auditLog('EXPORT_PDF', 'Session'), exportSessionPdf);
router.get('/sessions/:id/export/excel', exportRateLimiter, auditLog('EXPORT_EXCEL', 'Session'), exportSessionExcel);

// Analytics
router.get('/analytics', getFacultyAnalytics);

module.exports = router;
