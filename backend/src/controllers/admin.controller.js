const User = require('../models/User');
const Institution = require('../models/Institution');
const Department = require('../models/Department');
const Course = require('../models/Course');
const AuditLog = require('../models/AuditLog');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/helpers');
const { getInstitutionAnalytics } = require('../services/analytics.service');
const { sendWelcomeEmail } = require('../services/email.service');

// ========================= INSTITUTION =========================

const getInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.user.institutionId)
      .populate('adminId', 'name email')
      .lean();
    if (!institution) throw ApiError.notFound('Institution');
    res.json(ApiResponse.success('Institution retrieved.', { institution }));
  } catch (err) { next(err); }
};

const updateInstitution = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'address', 'geoLocation', 'logoUrl', 'contactEmail', 'contactPhone', 'website', 'settings'];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const institution = await Institution.findByIdAndUpdate(
      req.user.institutionId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json(ApiResponse.success('Institution updated.', { institution }));
  } catch (err) { next(err); }
};

// ========================= DEPARTMENTS =========================

const getDepartments = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = { institutionId: req.user.institutionId };
    if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };

    const [departments, total] = await Promise.all([
      Department.find(query)
        .populate('headFacultyId', 'name email')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Department.countDocuments(query),
    ]);

    res.json(ApiResponse.paginated('Departments retrieved.', departments, buildPaginationMeta(total, page, limit)));
  } catch (err) { next(err); }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, headFacultyId, description } = req.body;
    const department = await Department.create({
      institutionId: req.user.institutionId,
      name, code, headFacultyId: headFacultyId || undefined, description,
    });
    res.status(201).json(ApiResponse.success('Department created.', { department }, 201));
  } catch (err) { next(err); }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!department) throw ApiError.notFound('Department');
    res.json(ApiResponse.success('Department updated.', { department }));
  } catch (err) { next(err); }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const coursesInDept = await Course.countDocuments({
      departmentId: req.params.id,
      isActive: true,
    });
    if (coursesInDept > 0) {
      throw new ApiError(409, `Cannot delete department with ${coursesInDept} active course(s). Deactivate or reassign courses first.`);
    }
    const dept = await Department.findOneAndDelete({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });
    if (!dept) throw ApiError.notFound('Department');
    res.json(ApiResponse.success('Department deleted.'));
  } catch (err) { next(err); }
};

// ========================= COURSES =========================

const getCourses = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = { institutionId: req.user.institutionId };
    if (req.query.departmentId) query.departmentId = req.query.departmentId;
    if (req.query.search) query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { code: { $regex: req.query.search, $options: 'i' } },
    ];

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('departmentId', 'name code')
        .populate('facultyIds', 'name email')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(query),
    ]);

    res.json(ApiResponse.paginated('Courses retrieved.', courses, buildPaginationMeta(total, page, limit)));
  } catch (err) { next(err); }
};

const createCourse = async (req, res, next) => {
  try {
    const { name, code, departmentId, description, credits, semester, academicYear, schedule } = req.body;

    // Validate department belongs to institution
    const dept = await Department.findOne({
      _id: departmentId,
      institutionId: req.user.institutionId,
    });
    if (!dept) throw ApiError.notFound('Department');

    const course = await Course.create({
      institutionId: req.user.institutionId,
      departmentId,
      name, code, description, credits, semester, academicYear, schedule,
    });
    res.status(201).json(ApiResponse.success('Course created.', { course }, 201));
  } catch (err) { next(err); }
};

const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!course) throw ApiError.notFound('Course');
    res.json(ApiResponse.success('Course updated.', { course }));
  } catch (err) { next(err); }
};

const enrollStudentInCourse = async (req, res, next) => {
  try {
    const { courseId, studentId } = req.body;
    const [course, student] = await Promise.all([
      Course.findOne({ _id: courseId, institutionId: req.user.institutionId }),
      User.findOne({ _id: studentId, institutionId: req.user.institutionId, role: 'student', isActive: true }),
    ]);
    if (!course) throw ApiError.notFound('Course');
    if (!student) throw ApiError.notFound('Student');

    if (course.studentIds.includes(studentId)) {
      throw new ApiError(409, 'Student is already enrolled in this course.');
    }

    course.studentIds.push(studentId);
    await course.save();

    res.json(ApiResponse.success('Student enrolled successfully.', { course }));
  } catch (err) { next(err); }
};

// ========================= USERS =========================

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = { institutionId: req.user.institutionId };
    if (req.query.role) query.role = req.query.role;
    if (req.query.departmentId) query.departmentId = req.query.departmentId;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    if (req.query.search) query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { enrollmentNumber: { $regex: req.query.search, $options: 'i' } },
    ];

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('departmentId', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json(ApiResponse.paginated('Users retrieved.', users, buildPaginationMeta(total, page, limit)));
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, enrollmentNumber, employeeId } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw new ApiError(409, 'Email already in use.');

    const userData = {
      name, email, passwordHash: password, role,
      institutionId: req.user.institutionId,
      departmentId: departmentId || undefined,
      isEmailVerified: true,
    };
    if (role === 'student') userData.enrollmentNumber = enrollmentNumber;
    if (role === 'faculty') userData.employeeId = employeeId;

    const user = await User.create(userData);
    await sendWelcomeEmail(user, password);

    res.status(201).json(ApiResponse.success('User created.', { user }, 201));
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, departmentId, isActive, enrollmentNumber, employeeId, role } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (departmentId !== undefined) updates.departmentId = departmentId;
    if (isActive !== undefined) updates.isActive = isActive;
    if (enrollmentNumber !== undefined) updates.enrollmentNumber = enrollmentNumber;
    if (employeeId !== undefined) updates.employeeId = employeeId;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user) throw ApiError.notFound('User');
    res.json(ApiResponse.success('User updated.', { user }));
  } catch (err) { next(err); }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    }).select('+passwordHash');
    if (!user) throw ApiError.notFound('User');

    user.passwordHash = newPassword;
    user.refreshTokens = [];
    await user.save();

    res.json(ApiResponse.success('User password reset. All active sessions invalidated.'));
  } catch (err) { next(err); }
};

// ========================= ANALYTICS & AUDIT =========================

const getAdminAnalytics = async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId.toString();
    const [analytics, userStats] = await Promise.all([
      getInstitutionAnalytics(institutionId),
      User.aggregate([
        { $match: { institutionId: req.user.institutionId } },
        { $group: { _id: '$role', count: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
      ]),
    ]);

    const userStatsFormatted = userStats.reduce((acc, stat) => {
      acc[stat._id] = { total: stat.count, active: stat.active };
      return acc;
    }, {});

    res.json(ApiResponse.success('Analytics retrieved.', { analytics, userStats: userStatsFormatted }));
  } catch (err) { next(err); }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = { institutionId: req.user.institutionId };
    if (req.query.actorId) query.actorId = req.query.actorId;
    if (req.query.action) query.action = req.query.action;
    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) query.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json(ApiResponse.paginated('Audit logs retrieved.', logs, buildPaginationMeta(total, page, limit)));
  } catch (err) { next(err); }
};

module.exports = {
  getInstitution, updateInstitution,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getCourses, createCourse, updateCourse, enrollStudentInCourse,
  getUsers, createUser, updateUser, resetUserPassword,
  getAdminAnalytics, getAuditLogs,
};
