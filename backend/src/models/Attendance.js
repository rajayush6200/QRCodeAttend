const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    geoLocation: {
      lat: {
        type: Number,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        min: -180,
        max: 180,
      },
      accuracy: {
        type: Number, // GPS accuracy in meters
      },
      distanceFromSession: {
        type: Number, // computed distance in meters
      },
    },
    deviceFingerprint: {
      type: String,
      required: [true, 'Device fingerprint is required'],
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    verificationMethod: {
      type: String,
      enum: ['qr+gps', 'qr-only', 'manual'],
      default: 'qr+gps',
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    // Manual override by faculty
    isManualOverride: {
      type: Boolean,
      default: false,
    },
    overrideReason: {
      type: String,
    },
    overrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Compound unique index: one attendance per student per session
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ sessionId: 1, deviceFingerprint: 1 });
attendanceSchema.index({ studentId: 1, courseId: 1, markedAt: -1 });
attendanceSchema.index({ institutionId: 1, markedAt: -1 });
attendanceSchema.index({ courseId: 1, markedAt: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
