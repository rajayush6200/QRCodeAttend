const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLogger');
const {
  getInstitution, updateInstitution,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getCourses, createCourse, updateCourse, enrollStudentInCourse,
  getUsers, createUser, updateUser, resetUserPassword,
  getAdminAnalytics, getAuditLogs,
} = require('../controllers/admin.controller');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// Institution
router.get('/institution', getInstitution);
router.patch('/institution', auditLog('INSTITUTION_UPDATED', 'Institution'), updateInstitution);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', auditLog('DEPARTMENT_CREATED', 'Department'), createDepartment);
router.patch('/departments/:id', auditLog('DEPARTMENT_UPDATED', 'Department'), updateDepartment);
router.delete('/departments/:id', auditLog('DEPARTMENT_DELETED', 'Department'), deleteDepartment);

// Courses
router.get('/courses', getCourses);
router.post('/courses', auditLog('COURSE_CREATED', 'Course'), createCourse);
router.patch('/courses/:id', auditLog('COURSE_UPDATED', 'Course'), updateCourse);
router.post('/courses/enroll', auditLog('STUDENT_ENROLLED', 'Course'), enrollStudentInCourse);

// Users
router.get('/users', getUsers);
router.post('/users', auditLog('USER_CREATED', 'User'), createUser);
router.patch('/users/:id', auditLog('USER_UPDATED', 'User'), updateUser);
router.post('/users/:id/reset-password', auditLog('USER_PASSWORD_RESET', 'User'), resetUserPassword);

// Analytics & Audit
router.get('/analytics', getAdminAnalytics);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
