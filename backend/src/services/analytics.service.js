const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Course = require('../models/Course');
const { calcPercentage } = require('../utils/helpers');

/**
 * Analytics Service — Computes attendance statistics for Admin, Faculty, and Student dashboards.
 */

/**
 * Get attendance analytics for a specific course.
 * @param {string} courseId
 * @param {object} [filters] - Optional date range filters
 */
const getCourseAnalytics = async (courseId, filters = {}) => {
  const { startDate, endDate } = filters;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const sessionQuery = {
    courseId,
    status: 'completed',
    ...(Object.keys(dateFilter).length ? { scheduledAt: dateFilter } : {}),
  };

  const sessions = await Session.find(sessionQuery).sort({ scheduledAt: 1 }).lean();
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      averageAttendanceRate: 0,
      trend: [],
      summary: { present: 0, late: 0, absent: 0 },
    };
  }

  const sessionIds = sessions.map((s) => s._id);
  const attendances = await Attendance.find({ sessionId: { $in: sessionIds } }).lean();

  // Build trend data (one data point per session)
  const trend = sessions.map((session) => {
    const sessionAttendance = attendances.filter(
      (a) => a.sessionId.toString() === session._id.toString()
    );
    const presentCount = sessionAttendance.filter(
      (a) => a.status === 'present' || a.status === 'late'
    ).length;
    return {
      sessionId: session._id,
      title: session.title,
      date: session.scheduledAt,
      present: presentCount,
      total: session.totalStudents,
      rate: calcPercentage(presentCount, session.totalStudents),
    };
  });

  const totalPresent = attendances.filter(
    (a) => a.status === 'present'
  ).length;
  const totalLate = attendances.filter((a) => a.status === 'late').length;
  const totalEnrolled = sessions.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
  const totalAbsent = totalEnrolled - totalPresent - totalLate;

  const averageAttendanceRate = calcPercentage(
    trend.reduce((sum, t) => sum + t.rate, 0),
    totalSessions * 100,
    1
  );

  return {
    totalSessions,
    averageAttendanceRate,
    trend,
    summary: {
      present: totalPresent,
      late: totalLate,
      absent: Math.max(0, totalAbsent),
    },
  };
};

/**
 * Get a student's attendance summary across all enrolled courses.
 * @param {string} studentId
 */
const getStudentAnalytics = async (studentId) => {
  const attendances = await Attendance.find({ studentId })
    .populate('courseId', 'name code')
    .populate('sessionId', 'title scheduledAt status totalStudents')
    .sort({ markedAt: -1 })
    .lean();

  const courseMap = {};

  for (const record of attendances) {
    const courseKey = record.courseId?._id?.toString();
    if (!courseKey) continue;

    if (!courseMap[courseKey]) {
      courseMap[courseKey] = {
        courseId: courseKey,
        courseName: record.courseId.name,
        courseCode: record.courseId.code,
        totalSessions: 0,
        attended: 0,
        late: 0,
        absent: 0,
        records: [],
      };
    }

    courseMap[courseKey].totalSessions++;
    if (record.status === 'present') courseMap[courseKey].attended++;
    else if (record.status === 'late') courseMap[courseKey].late++;
    else if (record.status === 'absent') courseMap[courseKey].absent++;

    courseMap[courseKey].records.push({
      sessionId: record.sessionId?._id,
      sessionTitle: record.sessionId?.title,
      date: record.sessionId?.scheduledAt,
      status: record.status,
      markedAt: record.markedAt,
    });
  }

  const courseAnalytics = Object.values(courseMap).map((c) => ({
    ...c,
    attendanceRate: calcPercentage(c.attended + c.late, c.totalSessions),
    isLow: calcPercentage(c.attended + c.late, c.totalSessions) < 75,
  }));

  const overallRate = courseAnalytics.length
    ? calcPercentage(
        courseAnalytics.reduce((sum, c) => sum + c.attendanceRate, 0),
        courseAnalytics.length * 100,
        1
      )
    : 0;

  return {
    overallRate,
    totalCourses: courseAnalytics.length,
    lowAttendanceCourses: courseAnalytics.filter((c) => c.isLow),
    courses: courseAnalytics,
  };
};

/**
 * Get admin-level institution analytics.
 * @param {string} institutionId
 */
const getInstitutionAnalytics = async (institutionId) => {
  const [
    totalSessionsResult,
    totalAttendanceResult,
    sessionsByDay,
    topCourses,
  ] = await Promise.all([
    Session.countDocuments({ institutionId, status: 'completed' }),
    Attendance.countDocuments({ institutionId }),
    Session.aggregate([
      { $match: { institutionId: require('mongoose').Types.ObjectId.createFromHexString(institutionId.toString()), status: 'completed' } },
      { $group: { _id: { $dayOfWeek: '$scheduledAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]),
    Attendance.aggregate([
      { $match: { institutionId: require('mongoose').Types.ObjectId.createFromHexString(institutionId.toString()) } },
      { $group: { _id: '$courseId', count: { $sum: 1 }, presentCount: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, count: 1, presentCount: 1, courseName: '$course.name', courseCode: '$course.code' } },
    ]),
  ]);

  const dayNames = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sessionsByDayFormatted = sessionsByDay.map((d) => ({
    day: dayNames[d._id] || 'Unknown',
    count: d.count,
  }));

  return {
    totalSessions: totalSessionsResult,
    totalAttendanceRecords: totalAttendanceResult,
    sessionsByDay: sessionsByDayFormatted,
    topCourses: topCourses.map((c) => ({
      courseId: c._id,
      name: c.courseName,
      code: c.courseCode,
      totalAttendance: c.count,
      attendanceRate: calcPercentage(c.presentCount, c.count),
    })),
  };
};

module.exports = {
  getCourseAnalytics,
  getStudentAnalytics,
  getInstitutionAnalytics,
};
