const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Course = require('../models/Course');
const Department = require('../models/Department');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

let mongoServer;
let testInstitution, testDepartment, testCourse;
let student, faculty, studentToken, facultyToken;
let activeSession;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  testInstitution = await Institution.create({
    name: 'Attendance Test Uni',
    code: 'ATTUNI',
    geoLocation: { lat: 28.7041, lng: 77.1025 },
    isActive: true,
  });

  testDepartment = await Department.create({
    institutionId: testInstitution._id,
    name: 'Engineering',
    code: 'ENG',
  });

  faculty = await User.create({
    name: 'Test Faculty',
    email: 'att.faculty@test.com',
    passwordHash: 'Test@1234',
    role: 'faculty',
    institutionId: testInstitution._id,
    departmentId: testDepartment._id,
    employeeId: 'ATTFAC001',
    isActive: true,
  });

  student = await User.create({
    name: 'Test Student',
    email: 'att.student@test.com',
    passwordHash: 'Test@1234',
    role: 'student',
    institutionId: testInstitution._id,
    enrollmentNumber: 'ENG2021001',
    isActive: true,
  });

  testCourse = await Course.create({
    institutionId: testInstitution._id,
    departmentId: testDepartment._id,
    name: 'Algorithms',
    code: 'CS401',
    facultyIds: [faculty._id],
    studentIds: [student._id],
    isActive: true,
  });

  const [fRes, sRes] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: 'att.faculty@test.com', password: 'Test@1234' }),
    request(app).post('/api/v1/auth/login').send({ email: 'att.student@test.com', password: 'Test@1234' }),
  ]);
  facultyToken = fRes.body.data.tokens.accessToken;
  studentToken = sRes.body.data.tokens.accessToken;
});

beforeEach(async () => {
  await Session.deleteMany({});
  await Attendance.deleteMany({});

  // Create and start a session
  const createRes = await request(app)
    .post('/api/v1/faculty/sessions')
    .set('Authorization', `Bearer ${facultyToken}`)
    .send({
      courseId: testCourse._id.toString(),
      title: 'Test Attendance Session',
      topic: 'Test Topic',
      scheduledAt: new Date(Date.now() + 60000).toISOString(),
      geoLocation: { lat: 28.7041, lng: 77.1025, radius: 500 }, // Changed to 500 to pass validation
    });

  console.log('CREATE RES BODY:', createRes.body);

  const sessionId = createRes.body.data.session._id;

  const startRes = await request(app)
    .patch(`/api/v1/faculty/sessions/${sessionId}/start`)
    .set('Authorization', `Bearer ${facultyToken}`);

  // Load the session with secret for QR generation
  activeSession = await Session.findById(sessionId).select('+qrSecret');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('POST /api/v1/student/attendance/mark — Mark Attendance', () => {
  const buildPayload = (session) => {
    const token = session.getCurrentQrToken();
    const qrPayload = Buffer.from(
      JSON.stringify({ sid: session._id.toString(), tok: token, ts: Math.floor(Date.now() / 1000) })
    ).toString('base64');

    return {
      qrPayload,
      deviceFingerprint: 'a'.repeat(64), // 64-char hex-like fingerprint
      geoLocation: { lat: 28.7041, lng: 77.1025, accuracy: 10 },
    };
  };

  it('should mark attendance successfully', async () => {
    const payload = buildPayload(activeSession);
    const res = await request(app)
      .post('/api/v1/student/attendance/mark')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attendance.status).toBe('present');
    expect(res.body.data.attendance.verificationMethod).toBe('qr+gps');
  });

  it('should reject duplicate attendance from same student', async () => {
    const payload = buildPayload(activeSession);
    await request(app)
      .post('/api/v1/student/attendance/mark')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(payload);

    const res = await request(app)
      .post('/api/v1/student/attendance/mark')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ ...payload, deviceFingerprint: 'b'.repeat(64) });
    expect(res.status).toBe(409);
  });

  it('should reject attendance with invalid QR payload', async () => {
    const res = await request(app)
      .post('/api/v1/student/attendance/mark')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrPayload: Buffer.from(JSON.stringify({ sid: activeSession._id, tok: 'badtoken', ts: Date.now() })).toString('base64'),
        deviceFingerprint: 'c'.repeat(64),
        geoLocation: { lat: 28.7041, lng: 77.1025 },
      });
    expect(res.status).toBe(400);
  });

  it('should reject attendance outside geo-fence', async () => {
    // Update session to have tiny radius
    await Session.findByIdAndUpdate(activeSession._id, {
      'geoLocation.lat': 40.7128,   // New York
      'geoLocation.lng': -74.0060,
      'geoLocation.radius': 50,
    });
    const freshSession = await Session.findById(activeSession._id).select('+qrSecret');

    const payload = {
      qrPayload: buildPayload(freshSession).qrPayload,
      deviceFingerprint: 'd'.repeat(64),
      geoLocation: { lat: 28.7041, lng: 77.1025, accuracy: 5 }, // Delhi
    };

    const res = await request(app)
      .post('/api/v1/student/attendance/mark')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Location check failed');
  });

  it('should reject attendance for unenrolled course', async () => {
    // Create session for another course
    const anotherCourse = await Course.create({
      institutionId: testInstitution._id,
      departmentId: testDepartment._id,
      name: 'Unrelated Course',
      code: 'CS999X',
      facultyIds: [faculty._id],
      studentIds: [], // student NOT enrolled
      isActive: true,
    });
    const createRes = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: anotherCourse._id.toString(),
        title: 'Other Session',
        topic: 'Test Topic',
        scheduledAt: new Date(Date.now() + 60000).toISOString(),
        geoLocation: { lat: 28.7041, lng: 77.1025, radius: 500 },
      });
    await request(app)
      .patch(`/api/v1/faculty/sessions/${createRes.body.data.session._id}/start`)
      .set('Authorization', `Bearer ${facultyToken}`);

    const otherSession = await Session.findById(createRes.body.data.session._id).select('+qrSecret');
    const payload = buildPayload(otherSession);

    const res = await request(app)
      .post('/api/v1/student/attendance/mark')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(payload);
    expect(res.status).toBe(403);

    await Course.findByIdAndDelete(anotherCourse._id);
  });
});
