const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLogger');
const { qrScanRateLimiter } = require('../middleware/rateLimiter');
const {
  getMyCourses,
  markAttendance,
  getMyAttendance,
  getStudentAnalytics,
} = require('../controllers/student.controller');
const { attendanceValidators } = require('../validators/attendance.validators');

router.use(authenticate, authorize('student'));

router.get('/courses', getMyCourses);
router.post('/attendance/mark', qrScanRateLimiter, attendanceValidators, validate, auditLog('ATTENDANCE_MARKED', 'Attendance'), markAttendance);
router.get('/attendance', getMyAttendance);
router.get('/analytics', getStudentAnalytics);

module.exports = router;
