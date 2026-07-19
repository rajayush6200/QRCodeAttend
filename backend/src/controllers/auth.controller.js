const crypto = require('crypto');
const User = require('../models/User');
const Institution = require('../models/Institution');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../middleware/auth');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email.service');
const { generateToken, hashToken, getClientIp } = require('../utils/helpers');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role, institutionCode]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [faculty, student] }
 *               institutionCode: { type: string }
 *               enrollmentNumber: { type: string }
 *               employeeId: { type: string }
 */
const register = async (req, res, next) => {
  try {
    const {
      name, email, password, role, institutionCode,
      enrollmentNumber, employeeId, departmentId,
    } = req.body;

    // Only faculty and student can self-register; admins are created by super-admin
    if (role === 'admin') {
      throw new ApiError(403, 'Admin accounts cannot be self-registered.');
    }

    // Validate institution
    const institution = await Institution.findOne({
      code: institutionCode.toUpperCase(),
      isActive: true,
    });
    if (!institution) {
      throw new ApiError(404, `Institution with code '${institutionCode}' not found.`);
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    // Validate role-specific fields
    if (role === 'student' && !enrollmentNumber) {
      throw new ApiError(400, 'Enrollment number is required for students.');
    }

    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role,
      institutionId: institution._id,
      departmentId: departmentId || undefined,
      isEmailVerified: false,
    };

    if (role === 'student') userData.enrollmentNumber = enrollmentNumber;
    if (role === 'faculty') userData.employeeId = employeeId;

    const user = await User.create(userData);
    await sendWelcomeEmail(user);

    res.status(201).json(
      ApiResponse.success('Account created successfully. Please log in.', {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }, 201)
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT tokens
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user with password and refresh tokens
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +refreshTokens')
      .populate('institutionId', 'name code isActive');

    if (!user) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact your administrator.');
    }

    if (!user.institutionId?.isActive) {
      throw new ApiError(403, 'Your institution account has been suspended.');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const accessToken = generateAccessToken(user._id, user.role, user.institutionId._id);
    const refreshToken = generateRefreshToken(user._id);

    await user.addRefreshToken(refreshToken);

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    await user.save({ validateBeforeSave: false });

    res.status(200).json(
      ApiResponse.success('Login successful.', {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          institutionId: user.institutionId._id,
          institutionName: user.institutionId.name,
          profilePhoto: user.profilePhoto,
          lastLoginAt: user.lastLoginAt,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
        },
      })
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh the access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new ApiError(401, 'Refresh token is required.');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token. Please log in again.');
    }

    const user = await User.findById(decoded.userId)
      .select('+refreshTokens')
      .lean();

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or deactivated.');
    }

    if (!user.refreshTokens.includes(token)) {
      // Token reuse detected — invalidate all sessions
      await User.findByIdAndUpdate(decoded.userId, { $set: { refreshTokens: [] } });
      throw new ApiError(401, 'Refresh token reuse detected. All sessions invalidated. Please log in again.');
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(user._id, user.role, user.institutionId);
    const newRefreshToken = generateRefreshToken(user._id);

    const updatedTokens = user.refreshTokens.filter((t) => t !== token).concat(newRefreshToken);

    await User.findByIdAndUpdate(decoded.userId, {
      $set: { refreshTokens: updatedTokens },
    });

    res.status(200).json(
      ApiResponse.success('Token refreshed.', {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
        },
      })
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh token
 *     security: [{ BearerAuth: [] }]
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: token },
      });
    }

    res.status(200).json(ApiResponse.success('Logged out successfully.'));
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     security: [{ BearerAuth: [] }]
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('institutionId', 'name code logoUrl settings')
      .populate('departmentId', 'name code')
      .lean();

    if (!user) throw new ApiError.notFound('User');

    res.status(200).json(ApiResponse.success('User profile retrieved.', { user }));
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Update current user profile
 *     security: [{ BearerAuth: [] }]
 */
const updateMe = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'profilePhoto'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Handle password change
    if (req.body.currentPassword && req.body.newPassword) {
      const user = await User.findById(req.user._id).select('+passwordHash');
      const isValid = await user.comparePassword(req.body.currentPassword);
      if (!isValid) throw new ApiError(400, 'Current password is incorrect.');
      updates.passwordHash = req.body.newPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json(ApiResponse.success('Profile updated.', { user: updatedUser }));
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent user enumeration
    if (!user) {
      return res.status(200).json(
        ApiResponse.success('If that email exists, a reset link has been sent.')
      );
    }

    const resetToken = generateToken(32);
    const hashedToken = hashToken(resetToken);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    await sendPasswordResetEmail(user, resetUrl);

    res.status(200).json(ApiResponse.success('If that email exists, a reset link has been sent.'));
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body;

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new ApiError(400, 'Password reset token is invalid or has expired.');
    }

    user.passwordHash = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    res.status(200).json(ApiResponse.success('Password reset successful. Please log in with your new password.'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register, login, refreshToken, logout,
  getMe, updateMe, forgotPassword, resetPassword,
};
