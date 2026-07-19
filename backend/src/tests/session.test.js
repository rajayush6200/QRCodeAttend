const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Course = require('../models/Course');
const Department = require('../models/Department');
const Session = require('../models/Session');

let mongoServer;
let testInstitution;
let testDepartment;
let testCourse;
let faculty;
let facultyToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  testInstitution = await Institution.create({
    name: 'Session Test University',
    code: 'SESSUNI',
    geoLocation: { lat: 28.7041, lng: 77.1025 },
    isActive: true,
  });

  testDepartment = await Department.create({
    institutionId: testInstitution._id,
    name: 'Computer Science',
    code: 'CS',
    isActive: true,
  });

  faculty = await User.create({
    name: 'Dr. Faculty',
    email: 'faculty@test.com',
    passwordHash: 'Test@1234',
    role: 'faculty',
    institutionId: testInstitution._id,
    departmentId: testDepartment._id,
    employeeId: 'FAC001',
    isActive: true,
  });

  testCourse = await Course.create({
    institutionId: testInstitution._id,
    departmentId: testDepartment._id,
    name: 'Data Structures',
    code: 'CS301',
    facultyIds: [faculty._id],
    studentIds: [],
    isActive: true,
  });

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'faculty@test.com',
    password: 'Test@1234',
  });
  facultyToken = loginRes.body.data.tokens.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Session.deleteMany({});
});

describe('POST /api/v1/faculty/sessions — Create Session', () => {
  const validPayload = () => ({
    courseId: testCourse._id.toString(),
    title: 'Lecture 1: Arrays',
    topic: 'Introduction to arrays and complexity',
    scheduledAt: new Date(Date.now() + 60000).toISOString(),
    geoLocation: { lat: 28.7041, lng: 77.1025, radius: 50 },
    qrRotationInterval: 30,
  });

  it('should create a session successfully', async () => {
    const res = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.status).toBe('scheduled');
    expect(res.body.data.session.courseId).toBe(testCourse._id.toString());
  });

  it('should fail without required fields', async () => {
    const res = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ title: 'Incomplete' });
    expect(res.status).toBe(422);
  });

  it('should fail for course not assigned to faculty', async () => {
    const anotherCourse = await Course.create({
      institutionId: testInstitution._id,
      departmentId: testDepartment._id,
      name: 'Other Course',
      code: 'CS999',
      facultyIds: [], // No faculty
      isActive: true,
    });
    const res = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ ...validPayload(), courseId: anotherCourse._id.toString() });
    expect(res.status).toBe(404);
    await Course.findByIdAndDelete(anotherCourse._id);
  });
});

describe('PATCH /api/v1/faculty/sessions/:id/start — Start Session', () => {
  let sessionId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: testCourse._id.toString(),
        title: 'Lecture 2',
        scheduledAt: new Date().toISOString(),
        geoLocation: { lat: 28.7041, lng: 77.1025, radius: 100 },
      });
    sessionId = res.body.data.session._id;
  });

  it('should start a session and return QR code', async () => {
    const res = await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${facultyToken}`);
    
    console.log('START SESSION RES BODY:', res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.session.status).toBe('active');
    expect(res.body.data.qr).toHaveProperty('qrDataUrl');
    expect(res.body.data.qr).toHaveProperty('expiresIn');
    expect(res.body.data.qr.expiresIn).toBeGreaterThan(0);
  });

  it('should not start an already active session', async () => {
    await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${facultyToken}`);

    const res = await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/faculty/sessions/:id/end — End Session', () => {
  it('should end an active session', async () => {
    const createRes = await request(app)
      .post('/api/v1/faculty/sessions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: testCourse._id.toString(),
        title: 'End Test Session',
        scheduledAt: new Date().toISOString(),
        geoLocation: { lat: 28.7041, lng: 77.1025, radius: 50 },
      });
    const sessionId = createRes.body.data.session._id;

    await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${facultyToken}`);

    const endRes = await request(app)
      .patch(`/api/v1/faculty/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(endRes.status).toBe(200);
    expect(endRes.body.data.session.status).toBe('completed');
  });
});
