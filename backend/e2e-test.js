/**
 * QRCodeAttend - Comprehensive E2E API Test Script
 * Tests every major feature: Auth, Admin, Faculty, Student flows
 */
const http = require('http');

const BASE = 'http://localhost:5000/api/v1';
let adminToken, facultyToken, studentToken;
let createdSessionId, createdCourseId, institutionId, departmentId;

// Helper: make HTTP requests
function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(options, (res) => {
      let raw = '';
      res.on('data', (d) => (raw += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    r.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

let passed = 0, failed = 0, warnings = 0;
const results = [];

function log(icon, label, status, detail = '') {
  const line = `${icon} [${status}] ${label}${detail ? ' — ' + detail : ''}`;
  results.push(line);
  console.log(line);
}

function pass(label, detail) { passed++; log('✅', label, 'PASS', detail); }
function fail(label, detail) { failed++; log('❌', label, 'FAIL', detail); }
function warn(label, detail) { warnings++; log('⚠️ ', label, 'WARN', detail); }

async function run() {
  console.log('\n========== QRCodeAttend E2E API Tests ==========\n');

  // ---- 1. AUTH TESTS ----
  console.log('--- AUTH ---');

  // 1a. Login as Admin
  let r = await req('POST', '/auth/login', { email: 'admin@qrcodeattend.com', password: 'Admin@1234' });
  if (r.status === 200 && r.data?.data?.tokens?.accessToken) {
    adminToken = r.data.data.tokens.accessToken;
    institutionId = r.data.data.user?.institutionId;
    pass('Admin Login', `Token acquired, institutionId: ${institutionId}`);
  } else {
    fail('Admin Login', JSON.stringify(r.data?.message || r.data));
  }

  // 1b. Login as Faculty
  r = await req('POST', '/auth/login', { email: 'faculty@git.edu', password: 'Faculty@1234' });
  if (r.status === 200 && r.data?.data?.tokens?.accessToken) {
    facultyToken = r.data.data.tokens.accessToken;
    pass('Faculty Login');
  } else {
    fail('Faculty Login', JSON.stringify(r.data?.message || r.data));
  }

  // 1c. Login as Student
  r = await req('POST', '/auth/login', { email: 'student@git.edu', password: 'Student@1234' });
  if (r.status === 200 && r.data?.data?.tokens?.accessToken) {
    studentToken = r.data.data.tokens.accessToken;
    pass('Student Login');
  } else {
    fail('Student Login', JSON.stringify(r.data?.message || r.data));
  }

  // 1d. Get My Profile (admin)
  r = await req('GET', '/auth/me', null, adminToken);
  if (r.status === 200 && r.data?.data?.user?.email) {
    pass('Get /auth/me', `User: ${r.data.data.user.email}, Role: ${r.data.data.user.role}`);
  } else {
    fail('Get /auth/me', JSON.stringify(r.data?.message));
  }

  // 1e. Self-registration block (should block admin role)
  r = await req('POST', '/auth/register', { name: 'Test', email: 'test2@test.com', password: 'Test@1234', role: 'admin' });
  if (r.status === 403) {
    pass('Block Admin Self-Registration');
  } else {
    fail('Block Admin Self-Registration', `Got status ${r.status}`);
  }

  // ---- 2. ADMIN TESTS ----
  console.log('\n--- ADMIN ---');

  // 2a. Get Analytics
  r = await req('GET', '/admin/analytics', null, adminToken);
  if (r.status === 200) {
    pass('Admin Get Analytics', `totalCourses: ${r.data.data?.totalCourses}, totalSessions: ${r.data.data?.totalSessions}`);
  } else {
    fail('Admin Get Analytics', JSON.stringify(r.data?.message));
  }

  // 2b. Get Users List
  r = await req('GET', '/admin/users?limit=10', null, adminToken);
  if (r.status === 200 && Array.isArray(r.data?.data?.users)) {
    pass('Admin Get Users', `Found ${r.data.data.users.length} users`);
  } else {
    fail('Admin Get Users', JSON.stringify(r.data?.message));
  }

  // 2c. Create New User via Admin
  r = await req('POST', '/admin/users', {
    name: 'New Faculty Test',
    email: 'newfac@git.edu',
    password: 'Faculty@1234',
    role: 'faculty',
    employeeId: 'FAC002',
  }, adminToken);
  if (r.status === 201) {
    pass('Admin Create User');
  } else {
    warn('Admin Create User', JSON.stringify(r.data?.message));
  }

  // 2d. Get Departments
  r = await req('GET', '/admin/departments', null, adminToken);
  if (r.status === 200) {
    departmentId = r.data?.data?.departments?.[0]?._id;
    pass('Admin Get Departments', `Found ${r.data?.data?.departments?.length} dept(s)`);
  } else {
    fail('Admin Get Departments', JSON.stringify(r.data?.message));
  }

  // 2e. Get Courses
  r = await req('GET', '/admin/courses', null, adminToken);
  if (r.status === 200) {
    createdCourseId = r.data?.data?.courses?.[0]?._id;
    pass('Admin Get Courses', `Found ${r.data?.data?.courses?.length} course(s), courseId: ${createdCourseId}`);
  } else {
    fail('Admin Get Courses', JSON.stringify(r.data?.message));
  }

  // 2f. Get Audit Logs
  r = await req('GET', '/admin/audit-logs?limit=5', null, adminToken);
  if (r.status === 200) {
    pass('Admin Get Audit Logs', `Found ${r.data?.data?.logs?.length || 0} logs`);
  } else {
    fail('Admin Get Audit Logs', JSON.stringify(r.data?.message));
  }

  // ---- 3. FACULTY TESTS ----
  console.log('\n--- FACULTY ---');

  // 3a. Get My Courses
  r = await req('GET', '/faculty/courses', null, facultyToken);
  if (r.status === 200) {
    const courses = r.data?.data?.courses;
    createdCourseId = createdCourseId || courses?.[0]?._id;
    pass('Faculty Get My Courses', `Found ${courses?.length} course(s)`);
  } else {
    fail('Faculty Get My Courses', JSON.stringify(r.data?.message));
  }

  // 3b. Create Session
  if (createdCourseId) {
    r = await req('POST', '/faculty/sessions', {
      courseId: createdCourseId,
      title: 'Test Session — Lecture 1',
      topic: 'Introduction',
      scheduledAt: new Date(Date.now() + 60000).toISOString(),
      geoLocation: { lat: 28.7041, lng: 77.1025, radius: 100 },
      qrRotationInterval: 30,
    }, facultyToken);
    if (r.status === 201 && r.data?.data?.session?._id) {
      createdSessionId = r.data.data.session._id;
      pass('Faculty Create Session', `Session ID: ${createdSessionId}`);
    } else {
      fail('Faculty Create Session', JSON.stringify(r.data?.message || r.data));
    }
  } else {
    warn('Faculty Create Session', 'Skipped - no courseId available');
  }

  // 3c. Get Sessions List
  r = await req('GET', '/faculty/sessions', null, facultyToken);
  if (r.status === 200) {
    pass('Faculty Get Sessions', `Found ${r.data?.data?.length} session(s)`);
  } else {
    fail('Faculty Get Sessions', JSON.stringify(r.data?.message));
  }

  // 3d. Start Session
  if (createdSessionId) {
    r = await req('PATCH', `/faculty/sessions/${createdSessionId}/start`, {}, facultyToken);
    if (r.status === 200) {
      pass('Faculty Start Session', `Status: ${r.data?.data?.session?.status}`);
    } else {
      fail('Faculty Start Session', JSON.stringify(r.data?.message));
    }

    // 3e. Get QR for Active Session
    r = await req('GET', `/faculty/sessions/${createdSessionId}/qr`, null, facultyToken);
    if (r.status === 200 && r.data?.data?.qrPayload) {
      pass('Faculty Get QR', `Payload length: ${r.data.data.qrPayload?.length}, expiresIn: ${r.data.data.expiresIn}s`);
    } else {
      fail('Faculty Get QR', JSON.stringify(r.data?.message));
    }

    // 3f. Get Session Attendance
    r = await req('GET', `/faculty/sessions/${createdSessionId}/attendance`, null, facultyToken);
    if (r.status === 200) {
      pass('Faculty Get Attendance List', `${r.data?.data?.attendance?.length || 0} records`);
    } else {
      fail('Faculty Get Attendance List', JSON.stringify(r.data?.message));
    }

    // 3g. End Session
    r = await req('PATCH', `/faculty/sessions/${createdSessionId}/end`, {}, facultyToken);
    if (r.status === 200) {
      pass('Faculty End Session', `Status: ${r.data?.data?.session?.status}`);
    } else {
      fail('Faculty End Session', JSON.stringify(r.data?.message));
    }
  } else {
    warn('Faculty Session Tests', 'Skipped - no session created');
  }

  // 3h. Faculty Analytics
  r = await req('GET', '/faculty/analytics', null, facultyToken);
  if (r.status === 200) {
    pass('Faculty Analytics');
  } else {
    fail('Faculty Analytics', JSON.stringify(r.data?.message));
  }

  // ---- 4. STUDENT TESTS ----
  console.log('\n--- STUDENT ---');

  // 4a. Get Student Dashboard
  r = await req('GET', '/student/dashboard', null, studentToken);
  if (r.status === 200) {
    pass('Student Dashboard', `overallRate: ${r.data?.data?.overallAttendanceRate}`);
  } else {
    fail('Student Dashboard', JSON.stringify(r.data?.message));
  }

  // 4b. Get My Attendance
  r = await req('GET', '/student/attendance', null, studentToken);
  if (r.status === 200) {
    pass('Student Get Attendance', `Records: ${r.data?.data?.attendance?.length || 0}`);
  } else {
    fail('Student Get Attendance', JSON.stringify(r.data?.message));
  }

  // 4c. Get Active Sessions (for QR scan)
  r = await req('GET', '/student/sessions/active', null, studentToken);
  if (r.status === 200) {
    pass('Student Get Active Sessions', `Found: ${r.data?.data?.sessions?.length || 0} active`);
  } else {
    fail('Student Get Active Sessions', JSON.stringify(r.data?.message));
  }

  // ---- 5. SECURITY TESTS ----
  console.log('\n--- SECURITY ---');

  // 5a. Student can't access admin endpoint
  r = await req('GET', '/admin/users', null, studentToken);
  if (r.status === 403) {
    pass('RBAC: Student blocked from /admin/users');
  } else {
    fail('RBAC: Student blocked from /admin/users', `Got ${r.status}`);
  }

  // 5b. Unauthenticated access blocked
  r = await req('GET', '/admin/users', null, null);
  if (r.status === 401) {
    pass('Auth: Unauthenticated request blocked');
  } else {
    fail('Auth: Unauthenticated request blocked', `Got ${r.status}`);
  }

  // ---- SUMMARY ----
  console.log('\n========== TEST SUMMARY ==========');
  console.log(`✅ Passed:   ${passed}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📊 Total:    ${passed + failed + warnings}`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => r.includes('❌')).forEach(r => console.log(' ', r));
  }
}

run().catch(console.error);
