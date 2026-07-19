const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Institution code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{3,20}$/, 'Code must be 3-20 alphanumeric characters'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: String,
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
    },
    logoUrl: {
      type: String,
      default: null,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
    },
    website: {
      type: String,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    planExpiresAt: {
      type: Date,
    },
    maxStudents: {
      type: Number,
      default: 500,
    },
    maxFaculty: {
      type: Number,
      default: 50,
    },
    settings: {
      defaultQrRotationInterval: {
        type: Number,
        default: 30, // seconds
        min: 15,
        max: 120,
      },
      defaultGeoFenceRadius: {
        type: Number,
        default: 50, // meters
        min: 10,
        max: 500,
      },
      allowLateAttendance: {
        type: Boolean,
        default: true,
      },
      lateThresholdMinutes: {
        type: Number,
        default: 10,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

institutionSchema.index({ code: 1 });
institutionSchema.index({ isActive: 1 });

const Institution = mongoose.model('Institution', institutionSchema);
module.exports = Institution;
