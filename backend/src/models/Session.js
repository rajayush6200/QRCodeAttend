const mongoose = require('mongoose');
const { totp } = require('otplib');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty is required'],
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    topic: {
      type: String,
      trim: true,
      maxlength: [500, 'Topic cannot exceed 500 characters'],
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled time is required'],
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    geoLocation: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: -180,
        max: 180,
      },
      radius: {
        type: Number,
        default: 50, // meters
        min: 10,
        max: 500,
      },
    },
    // TOTP-based rotating QR
    qrSecret: {
      type: String,
      select: false, // never expose secret to client
    },
    qrRotationInterval: {
      type: Number,
      default: 30, // seconds
      min: 15,
      max: 120,
    },
    attendanceWindow: {
      openAt: {
        type: Date,
      },
      closeAt: {
        type: Date,
      },
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    lateCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

sessionSchema.index({ courseId: 1, status: 1 });
sessionSchema.index({ facultyId: 1, scheduledAt: -1 });
sessionSchema.index({ institutionId: 1, status: 1 });
sessionSchema.index({ status: 1, scheduledAt: 1 });

// Virtual: attendance percentage
sessionSchema.virtual('attendanceRate').get(function () {
  if (!this.totalStudents || this.totalStudents === 0) return 0;
  return Math.round((this.presentCount / this.totalStudents) * 100);
});

// Virtual: duration in minutes
sessionSchema.virtual('durationMinutes').get(function () {
  if (!this.startedAt || !this.endedAt) return null;
  return Math.round((this.endedAt - this.startedAt) / 60000);
});

// Generate a fresh QR secret for this session
sessionSchema.methods.generateQrSecret = function () {
  this.qrSecret = crypto.randomBytes(20).toString('hex').toUpperCase();
};

// Get current TOTP token (valid for qrRotationInterval)
sessionSchema.methods.getCurrentQrToken = function () {
  if (!this.qrSecret) return null;
  totp.options = {
    digits: 8,
    step: this.qrRotationInterval,
    algorithm: 'sha256',
  };
  return totp.generate(this.qrSecret);
};

// Verify a submitted QR token (allow current + previous window)
sessionSchema.methods.verifyQrToken = function (token) {
  if (!this.qrSecret) return false;
  totp.options = {
    digits: 8,
    step: this.qrRotationInterval,
    algorithm: 'sha256',
    window: 1, // allow 1 window tolerance
  };
  return totp.check(token, this.qrSecret);
};

// Time remaining until next QR rotation (seconds)
sessionSchema.methods.getQrSecondsRemaining = function () {
  const step = this.qrRotationInterval;
  const epoch = Math.floor(Date.now() / 1000);
  return step - (epoch % step);
};

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
