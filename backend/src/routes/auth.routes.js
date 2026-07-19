const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { auditLog } = require('../middleware/auditLogger');
const {
  register, login, refreshToken, logout,
  getMe, updateMe, forgotPassword, resetPassword,
} = require('../controllers/auth.controller');
const {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  updateProfileValidators,
} = require('../validators/auth.validators');

// Public routes
router.post('/register', authRateLimiter, registerValidators, validate, register);
router.post('/login', authRateLimiter, loginValidators, validate, auditLog('USER_LOGIN', 'User'), login);
router.post('/refresh', authRateLimiter, refreshToken);
router.post('/forgot-password', authRateLimiter, forgotPasswordValidators, validate, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPasswordValidators, validate, resetPassword);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.patch('/me', updateProfileValidators, validate, auditLog('PROFILE_UPDATED', 'User'), updateMe);

module.exports = router;
