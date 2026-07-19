const Session = require('../models/Session');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta, getClientIp } = require('../utils/helpers');
const { verifyQrPayload } = require('../services/qr.service');
const { verifyGeoFence } = require('../services/geo.service');
const { validateFingerprint, hashFingerprint, checkDuplicateDevice } = require('../services/fingerprint.service');
const { getStudentAnalytics } = require('../services/analytics.service');
const { getIo } = require('../socket/socketHandler');

// ========================= COURSES =========================

const getMyCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      studentIds: req.user._id,
      institutionId: req.user.institutionId,
      isActive: true,
    })
      .populate('departmentId', 'name code')
      .populate('facultyIds', 'name email profilePhoto')
      .sort({ name: 1 })
      .lean();

    res.json(ApiResponse.success('Enrolled courses retrieved.', { courses }));
  } catch (err) { next(err); }
};

// ========================= ATTENDANCE =========================

/**
 * Mark attendance by submitting a scanned QR payload with GPS and device fingerprint.
 *
 * Verification pipeline:
 * 1. Device fingerprint validation
 * 2. Session must be active
 * 3. Student must be enrolled in the course
 * 4. Attendance window must be open
 * 5. QR payload verification (TOTP)
 * 6. GPS geo-fence check
 * 7. Duplicate device check per session
 * 8. Duplicate student check per session (compound unique index)
 */
const markAttendance = async (req, res, next) => {
  try {
    const { qrPayload, geoLocation, deviceFingerprint } = req.body;

    // Step 1: Validate device fingerprint format
    const fpValidation = validateFingerprint(deviceFingerprint);
    if (!fpValidation.isValid) {
      throw new ApiError(400, fpValidation.reason);
    }

    // Decode session ID from QR payload first (to load session)
    let decodedSessionId;
    try {
      const rawDecoded = JSON.parse(Buffer.from(qrPayload, 'base64').toString('utf-8'));
      decodedSessionId = rawDecoded.sid;
    } catch {
      throw new ApiError(400, 'Invalid QR code format. Please scan the QR code displayed in class.');
    }

    // Step 2: Load session with secret
    const session = await Session.findOne({
      _id: decodedSessionId,
      status: 'active',
    }).select('+qrSecret');

    if (!session) {
      throw new ApiError(404, 'Session not found or is not currently active.');
    }

    // Step 3: Check student enrollment
    const course = await Course.findOne({
      _id: session.courseId,
      studentIds: req.user._id,
    });
    if (!course) {
      throw new ApiError(403, 'You are not enrolled in this course.');
    }

    // Step 4: Check attendance window
    const now = new Date();
    if (session.attendanceWindow?.openAt && now < new Date(session.attendanceWindow.openAt)) {
      throw new ApiError(400, 'Attendance window has not opened yet. Please wait.');
    }
    if (session.attendanceWindow?.closeAt && now > new Date(session.attendanceWindow.closeAt)) {
      throw new ApiError(400, 'Attendance window has closed for this session.');
    }

    // Determine if late
    const lateThresholdMs = 10 * 60 * 1000; // 10 minutes
    const isLate = session.attendanceWindow?.openAt &&
      now > new Date(new Date(session.attendanceWindow.openAt).getTime() + lateThresholdMs);

    // Step 5: Verify QR payload (TOTP)
    const qrVerification = verifyQrPayload(qrPayload, session);
    if (!qrVerification.isValid) {
      throw new ApiError(400, `QR verification failed: ${qrVerification.reason}`);
    }

    // Step 6: GPS geo-fence check
    let geoVerification = { isWithinRange: true, distance: null };
    let verificationMethod = 'qr-only';

    if (geoLocation?.lat !== undefined && geoLocation?.lng !== undefined) {
      geoVerification = verifyGeoFence(geoLocation, session.geoLocation);
      if (!geoVerification.isWithinRange) {
        throw new ApiError(400, `Location check failed: ${geoVerification.reason}`);
      }
      verificationMethod = 'qr+gps';
    }

    // Step 7: Hash fingerprint and check duplicate device
    const hashedFp = hashFingerprint(fpValidation.normalized, session._id.toString());
    const { isDuplicate, existingRecord } = await checkDuplicateDevice(hashedFp, session._id, Attendance);

    if (isDuplicate) {
      // A different student on same device? Proxy attempt!
      if (existingRecord.studentId.toString() !== req.user._id.toString()) {
        throw new ApiError(409, 'This device has already been used to mark attendance for a different student. Proxy attendance detected.');
      }
      // Same student, same device — already marked
      throw new ApiError(409, 'Your attendance has already been marked for this session.');
    }

    // Step 8: Create attendance record (duplicate student caught by unique index)
    let attendance;
    try {
      attendance = await Attendance.create({
        sessionId: session._id,
        studentId: req.user._id,
        courseId: session.courseId,
        institutionId: session.institutionId,
        status: isLate ? 'late' : 'present',
        geoLocation: geoLocation ? {
          lat: geoLocation.lat,
          lng: geoLocation.lng,
          accuracy: geoLocation.accuracy,
          distanceFromSession: geoVerification.distance,
        } : undefined,
        deviceFingerprint: hashedFp,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        verificationMethod,
        isVerified: true,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new ApiError(409, 'Your attendance has already been marked for this session.');
      }
      throw err;
    }

    // Update session present count
    const updateField = isLate ? { $inc: { lateCount: 1 } } : { $inc: { presentCount: 1 } };
    await Session.findByIdAndUpdate(session._id, updateField);

    // Notify faculty via Socket.IO
    const io = getIo();
    if (io) {
      const studentInfo = {
        _id: req.user._id,
        name: req.user.name,
        enrollmentNumber: req.user.enrollmentNumber,
        status: attendance.status,
        markedAt: attendance.markedAt,
        distance: geoVerification.distance,
      };
      io.to(`session:${session._id}`).emit('attendance:marked', studentInfo);
    }

    res.status(201).json(
      ApiResponse.success(
        `Attendance marked successfully as ${attendance.status.toUpperCase()}.`,
        {
          attendance: {
            _id: attendance._id,
            status: attendance.status,
            markedAt: attendance.markedAt,
            verificationMethod,
            distance: geoVerification.distance,
          },
        },
        201
      )
    );
  } catch (err) { next(err); }
};

const getMyAttendance = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = {
      studentId: req.user._id,
    };
    if (req.query.courseId) query.courseId = req.query.courseId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.from || req.query.to) {
      query.markedAt = {};
      if (req.query.from) query.markedAt.$gte = new Date(req.query.from);
      if (req.query.to) query.markedAt.$lte = new Date(req.query.to);
    }

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('sessionId', 'title scheduledAt startedAt status')
        .populate('courseId', 'name code')
        .sort({ markedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    res.json(ApiResponse.paginated('Attendance history retrieved.', records, buildPaginationMeta(total, page, limit)));
  } catch (err) { next(err); }
};

const getStudentAnalyticsHandler = async (req, res, next) => {
  try {
    const analytics = await getStudentAnalytics(req.user._id);
    res.json(ApiResponse.success('Analytics retrieved.', { analytics }));
  } catch (err) { next(err); }
};

module.exports = {
  getMyCourses,
  markAttendance,
  getMyAttendance,
  getStudentAnalytics: getStudentAnalyticsHandler,
};
