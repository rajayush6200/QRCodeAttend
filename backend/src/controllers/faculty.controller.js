const Session = require('../models/Session');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/helpers');
const { generateQrPayload } = require('../services/qr.service');
const { generateAttendancePdf, generateAttendanceExcel } = require('../services/export.service');
const { getCourseAnalytics } = require('../services/analytics.service');
const { sendSessionStartEmail } = require('../services/email.service');
const { getIo } = require('../socket/socketHandler');

// ========================= COURSES =========================

const getMyCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      facultyIds: req.user._id,
      institutionId: req.user.institutionId,
      isActive: true,
    })
      .populate('departmentId', 'name code')
      .sort({ name: 1 })
      .lean();

    res.json(ApiResponse.success('Courses retrieved.', { courses }));
  } catch (err) { next(err); }
};

// ========================= SESSIONS =========================

const getSessions = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = {
      facultyId: req.user._id,
      institutionId: req.user.institutionId,
    };
    if (req.query.status) query.status = req.query.status;
    if (req.query.courseId) query.courseId = req.query.courseId;

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate('courseId', 'name code')
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Session.countDocuments(query),
    ]);

    res.json(ApiResponse.paginated('Sessions retrieved.', sessions, buildPaginationMeta(total, page, limit)));
  } catch (err) { next(err); }
};

const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    })
      .populate('courseId', 'name code departmentId studentIds')
      .populate('facultyId', 'name email')
      .lean();

    if (!session) throw ApiError.notFound('Session');
    res.json(ApiResponse.success('Session retrieved.', { session }));
  } catch (err) { next(err); }
};

const createSession = async (req, res, next) => {
  try {
    const {
      courseId, title, topic, scheduledAt,
      geoLocation, qrRotationInterval, attendanceWindow,
    } = req.body;

    const course = await Course.findOne({
      _id: courseId,
      facultyIds: req.user._id,
      institutionId: req.user.institutionId,
      isActive: true,
    });
    if (!course) throw ApiError.notFound('Course or access denied.');

    const session = await Session.create({
      courseId,
      facultyId: req.user._id,
      institutionId: req.user.institutionId,
      title,
      topic,
      scheduledAt: new Date(scheduledAt),
      status: 'scheduled',
      geoLocation: {
        lat: geoLocation.lat,
        lng: geoLocation.lng,
        radius: geoLocation.radius || 50,
      },
      qrRotationInterval: qrRotationInterval || 30,
      totalStudents: course.studentIds.length,
      attendanceWindow: attendanceWindow ? {
        openAt: new Date(attendanceWindow.openAt),
        closeAt: new Date(attendanceWindow.closeAt),
      } : undefined,
    });

    await Course.findByIdAndUpdate(courseId, { $inc: { totalSessions: 1 } });

    res.status(201).json(ApiResponse.success('Session created.', { session }, 201));
  } catch (err) { next(err); }
};

const startSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
      status: 'scheduled',
    }).select('+qrSecret');

    if (!session) throw ApiError.notFound('Session or it is already started/completed.');

    // Generate QR secret
    session.generateQrSecret();
    session.status = 'active';
    session.startedAt = new Date();

    // Set default attendance window if not set
    if (!session.attendanceWindow?.openAt) {
      session.attendanceWindow = {
        openAt: new Date(),
        closeAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour default
      };
    }

    await session.save();

    // Generate first QR
    const qrData = await generateQrPayload(session);

    // Notify enrolled students via Socket.IO
    const io = getIo();
    if (io) {
      io.to(`course:${session.courseId}`).emit('session:started', {
        sessionId: session._id,
        title: session.title,
        courseId: session.courseId,
      });
    }

    // Send email notifications to students (async, non-blocking)
    const course = await Course.findById(session.courseId)
      .populate('studentIds', 'name email')
      .lean();
    if (course?.studentIds?.length) {
      setImmediate(async () => {
        for (const student of course.studentIds.slice(0, 50)) {
          // Limit to 50 emails per session start
          await sendSessionStartEmail(student, session, course);
        }
      });
    }

    // Create in-app notifications
    if (course?.studentIds?.length) {
      const notifications = course.studentIds.map((s) => ({
        userId: s._id,
        institutionId: req.user.institutionId,
        type: 'SESSION_STARTED',
        title: `Session Started: ${session.title}`,
        message: `${course.name} session has started. Scan the QR code to mark your attendance.`,
        resourceType: 'Session',
        resourceId: session._id,
      }));
      await Notification.insertMany(notifications, { ordered: false });
    }

    res.json(ApiResponse.success('Session started. QR code generated.', {
      session: { _id: session._id, status: session.status, startedAt: session.startedAt },
      qr: qrData,
    }));
  } catch (err) { next(err); }
};

const endSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
      status: 'active',
    });
    if (!session) throw ApiError.notFound('Active session');

    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    // Mark absent for students who didn't attend
    const course = await Course.findById(session.courseId).lean();
    if (course) {
      const markedStudentIds = await Attendance.find({ sessionId: session._id })
        .distinct('studentId');

      const absentStudents = course.studentIds.filter(
        (sid) => !markedStudentIds.some((m) => m.toString() === sid.toString())
      );

      if (absentStudents.length > 0) {
        const absentRecords = absentStudents.map((studentId) => ({
          sessionId: session._id,
          studentId,
          courseId: session.courseId,
          institutionId: session.institutionId,
          status: 'absent',
          deviceFingerprint: 'system-absent',
          isVerified: false,
          isManualOverride: true,
          overrideReason: 'Auto-marked absent on session end',
          overrideBy: req.user._id,
        }));
        await Attendance.insertMany(absentRecords, { ordered: false });
      }
    }

    // Notify via Socket.IO
    const io = getIo();
    if (io) {
      io.to(`session:${session._id}`).emit('session:ended', { sessionId: session._id });
    }

    res.json(ApiResponse.success('Session ended. Absent students auto-marked.', {
      session: { _id: session._id, status: session.status, endedAt: session.endedAt },
    }));
  } catch (err) { next(err); }
};

const cancelSession = async (req, res, next) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, facultyId: req.user._id, status: { $in: ['scheduled', 'active'] } },
      { $set: { status: 'cancelled', endedAt: new Date() } },
      { new: true }
    );
    if (!session) throw ApiError.notFound('Session');
    res.json(ApiResponse.success('Session cancelled.', { session }));
  } catch (err) { next(err); }
};

const getSessionQr = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
      status: 'active',
    }).select('+qrSecret');

    if (!session) throw ApiError.notFound('Active session');

    const qrData = await generateQrPayload(session);
    res.json(ApiResponse.success('QR code generated.', { qr: qrData }));
  } catch (err) { next(err); }
};

const getSessionAttendance = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });
    if (!session) throw ApiError.notFound('Session');

    const attendance = await Attendance.find({ sessionId: session._id })
      .populate('studentId', 'name email enrollmentNumber profilePhoto')
      .sort({ markedAt: 1 })
      .lean();

    const summary = {
      total: session.totalStudents,
      present: attendance.filter((a) => a.status === 'present').length,
      late: attendance.filter((a) => a.status === 'late').length,
      absent: attendance.filter((a) => a.status === 'absent').length,
    };

    res.json(ApiResponse.success('Attendance retrieved.', { session, attendance, summary }));
  } catch (err) { next(err); }
};

const overrideAttendance = async (req, res, next) => {
  try {
    const { studentId, status, reason } = req.body;

    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });
    if (!session) throw ApiError.notFound('Session');

    const updated = await Attendance.findOneAndUpdate(
      { sessionId: session._id, studentId },
      {
        $set: {
          status,
          isManualOverride: true,
          overrideReason: reason,
          overrideBy: req.user._id,
        },
      },
      { new: true, upsert: false }
    );
    if (!updated) throw ApiError.notFound('Attendance record');

    res.json(ApiResponse.success('Attendance overridden.', { attendance: updated }));
  } catch (err) { next(err); }
};

// ========================= EXPORT =========================

const exportSessionPdf = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    }).lean();
    if (!session) throw ApiError.notFound('Session');

    const [attendance, course] = await Promise.all([
      Attendance.find({ sessionId: session._id, status: { $ne: 'absent' } })
        .populate('studentId', 'name email enrollmentNumber')
        .sort({ markedAt: 1 })
        .lean(),
      Course.findById(session.courseId).lean(),
    ]);

    const pdfBuffer = await generateAttendancePdf(session, attendance, course, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${session._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

const exportSessionExcel = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    }).lean();
    if (!session) throw ApiError.notFound('Session');

    const [attendance, course] = await Promise.all([
      Attendance.find({ sessionId: session._id })
        .populate('studentId', 'name email enrollmentNumber')
        .sort({ markedAt: 1 })
        .lean(),
      Course.findById(session.courseId).lean(),
    ]);

    const excelBuffer = await generateAttendanceExcel(session, attendance, course, req.user);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${session._id}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) { next(err); }
};

// ========================= ANALYTICS =========================

const getFacultyAnalytics = async (req, res, next) => {
  try {
    const myCourses = await Course.find({
      facultyIds: req.user._id,
      institutionId: req.user.institutionId,
      isActive: true,
    }).lean();

    const analyticsPromises = myCourses.map((course) =>
      getCourseAnalytics(course._id, { startDate: req.query.from, endDate: req.query.to })
        .then((a) => ({ courseId: course._id, courseName: course.name, courseCode: course.code, ...a }))
    );

    const courseAnalytics = await Promise.all(analyticsPromises);

    const overallSessionCount = await Session.countDocuments({
      facultyId: req.user._id,
      status: 'completed',
    });

    res.json(ApiResponse.success('Analytics retrieved.', {
      overallSessionCount,
      courses: courseAnalytics,
    }));
  } catch (err) { next(err); }
};

module.exports = {
  getMyCourses,
  getSessions, getSessionById, createSession, startSession, endSession,
  cancelSession, getSessionQr, getSessionAttendance, overrideAttendance,
  exportSessionPdf, exportSessionExcel,
  getFacultyAnalytics,
};
