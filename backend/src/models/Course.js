const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    credits: {
      type: Number,
      min: 0,
      max: 10,
    },
    semester: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year format must be YYYY-YYYY'],
    },
    facultyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    schedule: {
      days: [
        {
          type: String,
          enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
      ],
      startTime: String, // "HH:MM"
      endTime: String,   // "HH:MM"
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

courseSchema.index({ institutionId: 1, departmentId: 1 });
courseSchema.index({ institutionId: 1, code: 1 }, { unique: true });
courseSchema.index({ facultyIds: 1 });
courseSchema.index({ studentIds: 1 });

// Virtual: enrollment count
courseSchema.virtual('enrollmentCount').get(function () {
  return this.studentIds ? this.studentIds.length : 0;
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
