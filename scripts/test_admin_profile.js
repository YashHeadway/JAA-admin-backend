import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const BASE_URL = `http://localhost:${env.PORT}${env.API_PREFIX}`;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TESTS FOR GET /api/admin/profile');
  console.log('====================================================');

  await mongoose.connect(env.MONGO_URI);
  const db = mongoose.connection.db;

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
    }
  }

  // --- TEST 1: Missing Cookie / Token ---
  {
    const res = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'GET',
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false && data.message === 'Authentication required',
      'Test 1: Missing cookie returns HTTP 401 Authentication required',
      `Got status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  }

  // --- TEST 2: Invalid JWT Cookie ---
  {
    const res = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'GET',
      headers: {
        Cookie: 'token=invalid_malformed_token_12345',
      },
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false && data.message === 'Authentication required',
      'Test 2: Invalid JWT cookie returns HTTP 401 Authentication required',
      `Got status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  }

  // --- TEST 3: Expired JWT Cookie ---
  {
    const expiredToken = jwt.sign(
      { id: 1, email: 'yash@gmail.com', role: 'Admin' },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'GET',
      headers: {
        Cookie: `token=${expiredToken}`,
      },
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false && data.message === 'Authentication required',
      'Test 3: Expired JWT cookie returns HTTP 401 Authentication required',
      `Got status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  }

  // --- TEST 4: Valid Admin Login & Fetch Profile (HTTP 200) ---
  let adminCookie = '';
  {
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'yash@gmail.com', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    const rawCookie = loginRes.headers.get('set-cookie');
    if (rawCookie) {
      adminCookie = rawCookie.split(';')[0];
    } else if (loginData.token) {
      adminCookie = `token=${loginData.token}`;
    }

    assert(
      loginRes.status === 200 && adminCookie.length > 0,
      'Test 4a: Admin login successful and cookie issued',
      `Status: ${loginRes.status}`
    );

    const profileRes = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'GET',
      headers: {
        Cookie: adminCookie,
      },
    });
    const profileData = await profileRes.json();

    const isSuccess =
      profileRes.status === 200 &&
      profileData.success === true &&
      profileData.message === 'Admin profile fetched successfully';

    const d = profileData.data || {};
    const hasRequiredFields =
      (d._id !== undefined || d.id !== undefined) &&
      d.email === 'yash@gmail.com' &&
      (d.role === 'admin' || d.role === 'Admin') &&
      d.name !== undefined &&
      d.profilePhoto !== undefined &&
      d.image === undefined &&
      d.avatar === undefined &&
      d.isActive === true;

    const noSensitiveFields = d.password === undefined && d.__v === undefined;

    assert(
      isSuccess && hasRequiredFields && noSensitiveFields,
      'Test 4b: Valid admin JWT cookie returns HTTP 200 with all profile fields (including profilePhoto, without image/avatar)',
      `Status: ${profileRes.status}, data: ${JSON.stringify(profileData)}`
    );
  }

  // --- TEST 5: Authenticated Non-Admin User (HTTP 403 Access Denied) ---
  {
    const memberToken = jwt.sign(
      { id: 7, email: 'mikeross@gmail.com', role: 'Member' },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const res = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'GET',
      headers: {
        Cookie: `token=${memberToken}`,
      },
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.success === false && data.message === 'Access denied',
      'Test 5: Authenticated non-admin member returns HTTP 403 Access denied',
      `Got status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  }

  // --- TEST 6: Deleted / Nonexistent Authenticated Admin (HTTP 404 Not Found) ---
  {
    const ghostToken = jwt.sign(
      { id: 999999, email: 'ghostadmin999999@gmail.com', role: 'Admin' },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const res = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'GET',
      headers: {
        Cookie: `token=${ghostToken}`,
      },
    });
    const data = await res.json();
    assert(
      res.status === 404 && data.success === false && data.message === 'Admin profile not found',
      'Test 6: Deleted/nonexistent admin in MongoDB returns HTTP 404 Admin profile not found',
      `Got status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  }

  // --- TEST 7: Inactive / Disabled Account (HTTP 403 Access Denied) ---
  {
    // Temporarily set an admin inactive
    await db.collection('admin-users').updateOne(
      { email: 'chintan.vankar@headway.org.in' },
      { $set: { isActive: false } }
    );

    const inactiveToken = jwt.sign(
      { id: 6, email: 'chintan.vankar@headway.org.in', role: 'Admin' },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const res = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'GET',
      headers: {
        Cookie: `token=${inactiveToken}`,
      },
    });
    const data = await res.json();

    // Revert status
    await db.collection('admin-users').updateOne(
      { email: 'chintan.vankar@headway.org.in' },
      { $set: { isActive: true } }
    );

    assert(
      res.status === 403 && data.success === false && data.message === 'Access denied',
      'Test 7: Inactive admin account returns HTTP 403 Access denied',
      `Got status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  }

  // --- TEST 8: URL ID Parameter and Sequence Validation ---
  {
    const resWithQuery = await fetch(`${BASE_URL}/admin/profile?foo=bar`, {
      method: 'GET',
      headers: {
        Cookie: adminCookie,
      },
    });
    const dataWithQuery = await resWithQuery.json();
    assert(
      resWithQuery.status === 200 && dataWithQuery.data.email === 'yash@gmail.com',
      "Test 8a: Query params do not break authenticated user's profile lookup",
      `Got email: ${dataWithQuery.data?.email}`
    );

    const resWithParam999 = await fetch(`${BASE_URL}/admin/profile/999`, {
      method: 'GET',
      headers: {
        Cookie: adminCookie,
      },
    });
    const dataWithParam999 = await resWithParam999.json();
    assert(
      resWithParam999.status === 404 && dataWithParam999.success === false && dataWithParam999.message === 'Admin profile not found',
      "Test 8b: GET /api/admin/profile/999 returns 404 Admin profile not found for non-existent ID",
      `Got status: ${resWithParam999.status}, body: ${JSON.stringify(dataWithParam999)}`
    );

    const resWithParam3 = await fetch(`${BASE_URL}/admin/profile/3`, {
      method: 'GET',
      headers: {
        Cookie: adminCookie,
      },
    });
    const dataWithParam3 = await resWithParam3.json();
    assert(
      resWithParam3.status === 200 && (dataWithParam3.data._id !== undefined) && dataWithParam3.data.email === 'yash@gmail.com',
      "Test 8c: GET /api/admin/profile/3 returns profile for existing admin #3",
      `Got body: ${JSON.stringify(dataWithParam3.data)}`
    );
  }

  // --- TEST 9: Existing Login & Other Routes Continue Working ---
  {
    const healthRes = await fetch(`http://localhost:${env.PORT}/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.status === 'UP',
      'Test 9a: Health endpoint works normally',
      `Status: ${healthRes.status}`
    );

    const loginRes = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'yashranpura3@gmail.com', password: '123456' }),
    });
    assert(
      loginRes.status === 200,
      'Test 9b: Admin login route works normally',
      `Status: ${loginRes.status}`
    );
  }

  await mongoose.disconnect();
  console.log('====================================================');
  console.log(`🏁 TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
