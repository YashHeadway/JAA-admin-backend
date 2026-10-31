import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { env } from '../src/config/env.js';

const BASE_URL = `http://localhost:${env.PORT}${env.API_PREFIX}`;

async function runImageTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING EXTENSIVE ADMIN PROFILE IMAGE FIELD TEST SUITE');
  console.log('===========================================================');

  await mongoose.connect(env.MONGO_URI);

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

  // 1. Login as admin
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'yash@gmail.com', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Cookie: `token=${token}`,
  };

  assert(loginRes.status === 200 && Boolean(token), 'Step 1: Admin login successful');

  // 2. GET /api/admin/profile has profilePhoto field and no image/avatar
  {
    const res = await fetch(`${BASE_URL}/admin/profile`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 && 'profilePhoto' in body.data && !('image' in body.data) && !('avatar' in body.data),
      'Step 2: GET /api/admin/profile returns profilePhoto and removes image/avatar fields',
      `Got body: ${JSON.stringify(body.data)}`
    );
  }

  // 3. PUT /api/admin/profile with JSON profilePhoto URL
  const testImageUrl = 'https://example.com/custom-admin-image.jpg';
  {
    const updateRes = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profilePhoto: testImageUrl }),
    });
    const updateBody = await updateRes.json();

    assert(
      updateRes.status === 200 &&
        updateBody.data?.profilePhoto === testImageUrl &&
        !('image' in updateBody.data) &&
        !('avatar' in updateBody.data),
      'Step 3: PUT /api/admin/profile with JSON photo updates profilePhoto and excludes image/avatar',
      `Got body: ${JSON.stringify(updateBody)}`
    );
  }

  // 4. GET /api/admin/profile confirms persistence
  {
    const res = await fetch(`${BASE_URL}/admin/profile`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 && body.data?.profilePhoto === testImageUrl,
      'Step 4: GET /api/admin/profile confirms profilePhoto persisted in DB',
      `Got profilePhoto: ${body.data?.profilePhoto}`
    );
  }

  // 5. POST /api/admin/profile with multipart/form-data uploading a file named 'profilePhoto'
  const tempImagePath = path.resolve('temp_test_image.png');
  // Create a minimal 1x1 PNG file buffer
  const minimalPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
  fs.writeFileSync(tempImagePath, minimalPng);

  let uploadedFileUrl = '';
  {
    const formData = new FormData();
    const fileBlob = new Blob([minimalPng], { type: 'image/png' });
    formData.append('profilePhoto', fileBlob, 'avatar-test.png');

    const uploadRes = await fetch(`${BASE_URL}/admin/profile`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    const uploadBody = await uploadRes.json();
    uploadedFileUrl = uploadBody.data?.profilePhoto || '';

    assert(
      uploadRes.status === 200 &&
        uploadedFileUrl.startsWith('/uploads/') &&
        uploadBody.data?.profilePhoto === uploadedFileUrl &&
        !('image' in uploadBody.data) &&
        !('avatar' in uploadBody.data),
      "Step 5: Form-data file upload with field 'profilePhoto' updates profilePhoto and excludes image/avatar",
      `Got body: ${JSON.stringify(uploadBody)}`
    );
  }

  // 6. GET /api/admin/profiles (all profiles) ensures all items have profilePhoto and no image/avatar
  {
    const res = await fetch(`${BASE_URL}/admin/profiles`, { headers: authHeaders });
    const body = await res.json();
    const allHaveProfilePhoto = Array.isArray(body.data) && body.data.every((p) => 'profilePhoto' in p);
    const noneHaveImageOrAvatar = Array.isArray(body.data) && body.data.every((p) => !('image' in p) && !('avatar' in p));

    assert(
      res.status === 200 && allHaveProfilePhoto && noneHaveImageOrAvatar && body.data.length > 0,
      'Step 6: GET /api/admin/profiles returns profilePhoto without image/avatar on every profile',
      `Count: ${body.data?.length}`
    );
  }

  // 7. GET /api/admin/profile/:id returns profilePhoto
  {
    const res = await fetch(`${BASE_URL}/admin/profile/3`, { headers: authHeaders });
    const body = await res.json();

    assert(
      res.status === 200 && 'profilePhoto' in body.data && !('image' in body.data) && !('avatar' in body.data) && body.data.profilePhoto === uploadedFileUrl,
      'Step 7: GET /api/admin/profile/:id includes profilePhoto matching uploaded file and excludes image/avatar',
      `Got body: ${JSON.stringify(body.data)}`
    );
  }

  // Cleanup temp file
  if (fs.existsSync(tempImagePath)) {
    fs.unlinkSync(tempImagePath);
  }

  await mongoose.disconnect();

  console.log('===========================================================');
  console.log(`🏁 IMAGE FIELD TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('===========================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runImageTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

