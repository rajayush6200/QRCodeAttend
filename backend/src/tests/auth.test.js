const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Institution = require('../models/Institution');

let mongoServer;
let testInstitution;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create a test institution
  testInstitution = await Institution.create({
    name: 'Test University',
    code: 'TESTUNI',
    geoLocation: { lat: 28.7041, lng: 77.1025 },
    plan: 'pro',
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('POST /api/v1/auth/register', () => {
  const validPayload = {
    name: 'John Student',
    email: 'john@test.com',
    password: 'Test@1234',
    role: 'student',
    institutionCode: 'TESTUNI',
    enrollmentNumber: 'CS2021001',
  };

  it('should register a student successfully', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('john@test.com');
    expect(res.body.data.user.role).toBe('student');
  });

  it('should fail with missing required fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should fail with invalid institution code', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...validPayload,
      institutionCode: 'INVALID',
    });
    expect(res.status).toBe(404);
  });

  it('should fail duplicate email registration', async () => {
    await request(app).post('/api/v1/auth/register').send(validPayload);
    const res = await request(app).post('/api/v1/auth/register').send(validPayload);
    expect(res.status).toBe(409);
  });

  it('should reject admin self-registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...validPayload,
      role: 'admin',
    });
    expect(res.status).toBe(422);
  });

  it('should reject weak passwords', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...validPayload,
      email: 'weak@test.com',
      password: 'password',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await User.create({
      name: 'Login Test',
      email: 'login@test.com',
      passwordHash: 'Test@1234',
      role: 'student',
      institutionId: testInstitution._id,
      enrollmentNumber: 'CS001',
      isActive: true,
    });
  });

  it('should login successfully and return tokens', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@test.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
    expect(res.body.data.user.role).toBe('student');
  });

  it('should fail with wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@test.com',
      password: 'WrongPassword1',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should fail with non-existent email', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody@test.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(401);
  });

  it('should fail for deactivated user', async () => {
    await User.findOneAndUpdate({ email: 'login@test.com' }, { isActive: false });
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@test.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/auth/me', () => {
  let accessToken;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Me Test',
      email: 'me@test.com',
      passwordHash: 'Test@1234',
      role: 'faculty',
      institutionId: testInstitution._id,
      employeeId: 'FAC001',
      isActive: true,
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'me@test.com',
      password: 'Test@1234',
    });
    accessToken = loginRes.body.data.tokens.accessToken;
  });

  it('should return current user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@test.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should fail without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('should refresh tokens successfully', async () => {
    // Register and login first
    await request(app).post('/api/v1/auth/register').send({
      name: 'Refresh User',
      email: 'refresh@test.com',
      password: 'Test@1234',
      role: 'student',
      institutionCode: 'TESTUNI',
      enrollmentNumber: 'CS003',
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'refresh@test.com',
      password: 'Test@1234',
    });
    const { refreshToken } = loginRes.body.data.tokens;

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    console.log('REFRESH RES BODY:', res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
    // New refresh token should differ (rotation)
    expect(res.body.data.tokens.refreshToken).not.toBe(refreshToken);
  });

  it('should fail with invalid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: 'invalid.token.value',
    });
    expect(res.status).toBe(401);
  });
});
