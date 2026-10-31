import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log('=== STARTING COMPLETE ADMIN PROFILE VERIFICATION ===\n');

  // Test Admin: yash@gmail.com
  const adminToken = jwt.sign(
    { id: 3, email: 'yash@gmail.com', role: 'Admin' },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  const authHeaders = {
    Authorization: `Bearer ${adminToken}`,
    Cookie: `token=${adminToken}`,
    'Content-Type': 'application/json',
  };

  // 1. GET /api/admin/profile (Currently authenticated admin)
  console.log('--- 1. Testing GET /api/admin/profile ---');
  const res1 = await fetch(`${BASE_URL}/admin/profile`, { headers: authHeaders });
  const data1 = await res1.json();
  console.log(`Status: ${res1.status}`);
  console.log('Response body:', JSON.stringify(data1, null, 2));

  if (res1.status !== 200 || !data1.success || !data1.data?._id) {
    throw new Error('Failed GET /api/admin/profile');
  }

  // Verify fields match specification
  const fields = ['_id', 'name', 'email', 'phone', 'role', 'profilePhoto', 'isActive', 'createdAt', 'updatedAt'];
  for (const f of fields) {
    if (!(f in data1.data)) {
      throw new Error(`Missing expected field: ${f} in data`);
    }
  }
  if ('image' in data1.data || 'avatar' in data1.data) {
    throw new Error('image or avatar should not be present in response data');
  }
  console.log('✅ Formatted data keys verified:', Object.keys(data1.data));

  // 2. GET /api/admin/profiles (All admin profiles)
  console.log('\n--- 2. Testing GET /api/admin/profiles ---');
  const res2 = await fetch(`${BASE_URL}/admin/profiles`, { headers: authHeaders });
  const data2 = await res2.json();
  console.log(`Status: ${res2.status}`);
  console.log(`Total profiles returned: ${data2.data?.length}`);
  console.log('First 2 profiles:', JSON.stringify(data2.data?.slice(0, 2), null, 2));

  if (res2.status !== 200 || !data2.success || !Array.isArray(data2.data) || data2.data.length === 0) {
    throw new Error('Failed GET /api/admin/profiles');
  }

  // 3. GET /api/admin/profile/all (Alias)
  console.log('\n--- 3. Testing GET /api/admin/profile/all ---');
  const res3 = await fetch(`${BASE_URL}/admin/profile/all`, { headers: authHeaders });
  const data3 = await res3.json();
  console.log(`Status: ${res3.status}, Profiles count: ${data3.data?.length}`);
  if (res3.status !== 200 || !data3.success) {
    throw new Error('Failed GET /api/admin/profile/all');
  }

  // 4. GET /api/admin/profile/:id (Specific ID: 7 for Yash Ranpura)
  console.log('\n--- 4. Testing GET /api/admin/profile/7 (Yash Ranpura) ---');
  const res4 = await fetch(`${BASE_URL}/admin/profile/7`, { headers: authHeaders });
  const data4 = await res4.json();
  console.log(`Status: ${res4.status}`);
  console.log('Response body:', JSON.stringify(data4, null, 2));
  if (res4.status !== 200 || data4.data?.name !== 'Yash Ranpura') {
    throw new Error('Failed GET /api/admin/profile/7');
  }

  // 5. GET /api/admin/profile/999 (Non-existent ID -> Must be 404)
  console.log('\n--- 5. Testing GET /api/admin/profile/999 (Non-existent ID) ---');
  const res5 = await fetch(`${BASE_URL}/admin/profile/999`, { headers: authHeaders });
  const data5 = await res5.json();
  console.log(`Status: ${res5.status}`);
  console.log('Response body:', JSON.stringify(data5, null, 2));
  if (res5.status !== 404 || data5.success !== false) {
    throw new Error('Expected 404 for non-existent profile');
  }

  // 6. Test Automatic Profile Creation on New Admin Registration
  console.log('\n--- 6. Testing New Admin Registration & Auto-Profile Creation ---');
  const testEmail = `auto_admin_${Date.now()}@example.com`;
  const regPayload = {
    email: testEmail,
    password: 'Password@123',
    name: 'Auto Admin Test',
    phone: '9876543210',
  };

  const regRes = await fetch(`${BASE_URL}/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });
  const regData = await regRes.json();
  console.log(`Register status: ${regRes.status}`);
  console.log('Register response:', JSON.stringify(regData, null, 2));

  if (regRes.status !== 201 || !regData.token) {
    throw new Error(`Failed to register test admin: ${JSON.stringify(regData)}`);
  }

  // Now login as the new admin and fetch /api/admin/profile
  const newAdminHeaders = {
    Authorization: `Bearer ${regData.token}`,
    Cookie: `token=${regData.token}`,
  };

  const newProfRes = await fetch(`${BASE_URL}/admin/profile`, { headers: newAdminHeaders });
  const newProfData = await newProfRes.json();
  console.log(`New Admin Profile fetch status: ${newProfRes.status}`);
  console.log('New Admin Profile payload:');
  console.log(JSON.stringify(newProfData, null, 2));

  if (
    newProfRes.status !== 200 ||
    newProfData.data.email !== testEmail ||
    newProfData.data.name !== 'Auto Admin Test' ||
    newProfData.data.phone !== '9876543210' ||
    newProfData.data.profilePhoto !== null ||
    newProfData.data.image !== undefined ||
    newProfData.data.avatar !== undefined ||
    newProfData.data.isActive !== true ||
    newProfData.data.role !== 'admin'
  ) {
    throw new Error('Newly created admin profile does not match expected automatic creation specification!');
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Everything is working cleanly and adhering to user specification.');

  // Cleanup test user
  const { connectDB } = await import('../src/config/db.js');
  const { AdminUser } = await import('../src/models/AdminUser.js');
  const { AdminProfile } = await import('../src/models/AdminProfile.js');
  const mongoose = await import('mongoose');

  await connectDB();
  await AdminUser.deleteOne({ email: testEmail });
  await AdminProfile.deleteOne({ email: testEmail });
  await mongoose.default.disconnect();
  console.log('🧹 Cleanup of test admin completed.');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
