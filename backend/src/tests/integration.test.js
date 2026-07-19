const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { generateToken, hashToken } = require('../utils/helpers');

let mongoServer;
let institution, department, course;
let admin, faculty, student;
let adminToken, facultyToken, studentToken;
let sessionId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  institution = await Institution.create({
    name: 'Integration Test University',
    code: 'INTUNI',
    geoLocation: { lat: 28.7041, lng: 77.1025 },
    isActive: true,
  });

  department = await Department.create({
    institutionId: institution._id,
    name: 'Computer Science',
    code: 'CS',
    isActive: true,
  });

  admin = await User.create({
    name: 'Admin User',
    email: 'admin@intuni.test',
    passwordHash: 'Test@1234',
    role: 'admin',
    institutionId: institution._id,
    isActive: true,
  });

  faculty = await User.create({
    name: 'Faculty User',
    email: 'faculty@intuni.test',
    passwordHash: 'Test@1234',
    role: 'faculty',
    institutionId: institution._id,
    departmentId: department._id,
    employeeId: 'FACINT001',
    isActive: true,
  });

  student = await User.create({
    name: 'Student User',
    email: 'student@intuni.test',
    passwordHash: 'Test@1234',
    role: 'student',
    institutionId: institution._id,
    enrollmentNumber: 'INT2021001',
    isActive: true,
  });

  course = await Course.create({
    institutionId: institution._id,
    departmentId: department._id,
    name: 'Integration Testing',
    code: 'CS501',
    facultyIds: [faculty._id],
    studentIds: [student._id],
    isActive: true,
  });

  const [aRes, fRes, sRes] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: 'admin@intuni.test', password: 'Test@1234' }),
    request(app).post('/api/v1/auth/login').send({ email: 'faculty@intuni.test', password: 'Test@1234' }),
    request(app).post('/api/v1/auth/login').send({ email: 'student@intuni.test', password: 'Test@1234' }),
  ]);

  adminToken = aRes.body.data.tokens.accessToken;
  facultyToken = fRes.body.data.tokens.accessToken;
  studentToken = sRes.body.data.tokens.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Health & Swagger', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth — extended endpoints', () => {
  it('PATCH /auth/me updates profile', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Updated Student Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Student Name');
  });

  it('POST /auth/logout succeeds', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'student@intuni.test',
      password: 'Test@1234',
    });
    const { refreshToken } = loginRes.body.data.tokens;
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /auth/forgot-password returns success', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'student@intuni.test',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /auth/reset-password resets with valid token', async () => {
    const resetToken = generateToken(32);
    const hashedToken = hashToken(resetToken);
    await User.findByIdAndUpdate(student._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 3600000),
    });

    const res = await request(app).post('/api/v1/auth/reset-password').send({
      token: resetToken,
      email: 'student@intuni.test',
      newPassword: 'NewTest@1234',
    });
    expect(res.status).toBe(200);

    // Restore password for other tests
    const user = await User.findById(student._id).select('+passwordHash');
    user.passwordHash = 'Test@1234';
    await user.save();
  });
});

describe('Admin endpoints', () => {
  let newDeptId;
  let newCourseId;
  let newUserId;

  it('GET /admin/institution', async () => {
    const res = await request(app)
      .get('/api/v1/admin/institution')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.institution.name).toBe('Integration Test University');
  });

  it('PATCH /admin/institution', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/institution')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contactEmail: 'admin@intuni.test' });
    expect(res.status).toBe(200);
  });

  it('GET /admin/departments', async () => {
    const res = await request(app)
      .get('/api/v1/admin/departments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /admin/departments creates department', async () => {
    const res = await request(app)
      .post('/api/v1/admin/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Mathematics', code: 'MATH' });
    expect(res.status).toBe(201);
    newDeptId = res.body.data.department._id;
  });

  it('PATCH /admin/departments/:id', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/departments/${newDeptId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Math department' });
    expect(res.status).toBe(200);
  });

  it('GET /admin/courses', async () => {
    const res = await request(app)
      .get('/api/v1/admin/courses')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('POST /admin/courses creates course', async () => {
    const res = await request(app)
      .post('/api/v1/admin/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Linear Algebra',
        code: 'MATH101',
        departmentId: department._id.toString(),
        credits: 3,
      });
    expect(res.status).toBe(201);
    newCourseId = res.body.data.course._id;
  });

  it('PATCH /admin/courses/:id', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/courses/${newCourseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ facultyIds: [faculty._id.toString()] });
    expect(res.status).toBe(200);
  });

  it('POST /admin/courses/enroll enrolls student', async () => {
    const res = await request(app)
      .post('/api/v1/admin/courses/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseId: newCourseId, studentId: student._id.toString() });
    expect(res.status).toBe(200);
  });

  it('GET /admin/users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /admin/users creates user', async () => {
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Student',
        email: 'newstudent@intuni.test',
        password: 'Test@1234',
        role: 'student',
        enrollmentNumber: 'INT2021002',
      });
    expect(res.status).toBe(201);
    newUserId = res.body.data.user._id;
  });

  it('PATCH /admin/users/:id', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed Student' });
    expect(res.status).toBe(200);
  });

  it('POST /admin/users/:id/reset-password', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${newUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'Reset@1234' });
    expect(res.status).toBe(200);
  });

  it('GET /admin/analytics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('analytics');
  });

  it('GET /admin/audit-logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /admin/departments/:id deletes empty department', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/departments/${newDeptId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('rejects non-admin access', async () => {
    const res = await request(app)
      .get('/api/v1/admin/institution')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Faculty — extended endpoints', () => {
  beforeAll(async () => {
    const createRes = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: course._id.toString(),
        title: 'Integration Session',
        topic: 'Full test',
        scheduledAt: new Date().toISOString(),
        geoLocation: { lat: 28.7041, lng: 77.1025, radius: 500 },
      });
    sessionId = createRes.body.data.session._id;

    await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${facultyToken}`);
  });

  it('GET /faculty/courses', async () => {
    const res = await request(app)
      .get('/api/v1/faculty/courses')
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.courses.length).toBeGreaterThan(0);
  });

  it('GET /faculty/sessions', async () => {
    const res = await request(app)
      .get('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /faculty/sessions/:id', async () => {
    const res = await request(app)
      .get(`/api/v1/faculty/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session._id).toBe(sessionId);
  });

  it('GET /faculty/sessions/:id/qr', async () => {
    const res = await request(app)
      .get(`/api/v1/faculty/sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.qr).toHaveProperty('qrDataUrl');
  });

  it('GET /faculty/sessions/:id/attendance', async () => {
    const res = await request(app)
      .get(`/api/v1/faculty/sessions/${sessionId}/attendance`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('summary');
  });

  it('GET /faculty/analytics', async () => {
    const res = await request(app)
      .get('/api/v1/faculty/analytics')
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('courses');
  });

  it('PATCH /faculty/sessions/:id/cancel cancels scheduled session', async () => {
    const createRes = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: course._id.toString(),
        title: 'Cancel Test Session',
        scheduledAt: new Date().toISOString(),
        geoLocation: { lat: 28.7041, lng: 77.1025, radius: 100 },
      });

    const res = await request(app)
      .patch(`/api/v1/faculty/sessions/${createRes.body.data.session._id}/cancel`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.status).toBe('cancelled');
  });
});

describe('Student — extended endpoints', () => {
  it('GET /student/courses', async () => {
    const res = await request(app)
      .get('/api/v1/student/courses')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.courses.length).toBeGreaterThan(0);
  });

  it('GET /student/attendance', async () => {
    const res = await request(app)
      .get('/api/v1/student/attendance')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /student/analytics', async () => {
    const res = await request(app)
      .get('/api/v1/student/analytics')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('analytics');
  });
});

describe('Notifications', () => {
  let notificationId;

  beforeAll(async () => {
    const notif = await Notification.create({
      userId: student._id,
      institutionId: institution._id,
      type: 'TEST',
      title: 'Test Notification',
      message: 'This is a test notification.',
    });
    notificationId = notif._id.toString();
  });

  it('GET /notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toHaveProperty('unreadCount');
  });

  it('PATCH /notifications/:id/read', async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notification.isRead).toBe(true);
  });

  it('PATCH /notifications/read-all', async () => {
    await Notification.create({
      userId: student._id,
      institutionId: institution._id,
      type: 'TEST',
      title: 'Unread',
      message: 'Unread notification.',
    });
    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /notifications/:id', async () => {
    const res = await request(app)
      .delete(`/api/v1/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Faculty — export & override (after attendance)', () => {
  beforeAll(async () => {
    const session = await Session.findById(sessionId).select('+qrSecret');
    const token = session.getCurrentQrToken();
    const qrPayload = Buffer.from(
      JSON.stringify({ sid: session._id.toString(), tok: token, ts: Math.floor(Date.now() / 1000) })
    ).toString('base64');

    await request(app)
      .post('/api/v1/student/attendance/mark')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrPayload,
        deviceFingerprint: 'e'.repeat(64),
        geoLocation: { lat: 28.7041, lng: 77.1025, accuracy: 10 },
      });
  });

  it('PATCH /faculty/sessions/:id/attendance/override', async () => {
    const res = await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/attendance/override`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        studentId: student._id.toString(),
        status: 'present',
        reason: 'Manual correction',
      });
    expect(res.status).toBe(200);
  });

  it('GET /faculty/sessions/:id/export/pdf', async () => {
    const res = await request(app)
      .get(`/api/v1/faculty/sessions/${sessionId}/export/pdf`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('GET /faculty/sessions/:id/export/excel', async () => {
    const res = await request(app)
      .get(`/api/v1/faculty/sessions/${sessionId}/export/excel`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  it('PATCH /faculty/sessions/:id/end ends session', async () => {
    const res = await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.status).toBe('completed');
  });
});
