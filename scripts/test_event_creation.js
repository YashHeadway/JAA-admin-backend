import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Event } from '../src/models/Event.js';

const BASE_URL = `http://localhost:${env.PORT}${env.API_PREFIX}`;

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING POST /api/admin/events VERIFICATION SUITE');
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

  // Generate Admin JWT Token
  const token = jwt.sign(
    { id: 3, email: 'yash@gmail.com', role: 'Admin' },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const createdIds = [];

  // Test 1: User's exact scenario from Screenshot 1 (address: 'test', isActive: 'true' as form-data)
  {
    const formData = new FormData();
    formData.append('startDate', '2026-11-10');
    formData.append('endTime', '2026-11-12');
    formData.append('city', 'test');
    formData.append('address', 'test');
    formData.append('postedBy', 'Admin');
    formData.append('description', 'test');
    formData.append('isActive', 'true');
    formData.append('endDate', '2026-11-12');
    formData.append('startTime', '10:00 AM');

    const res = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    const body = await res.json();

    assert(
      res.status === 201 && body.success === true && body.data?.id,
      'Test 1: User Screenshot 1 payload (address: test, isActive: "true") creates event successfully',
      `Status: ${res.status}, response: ${JSON.stringify(body)}`
    );
    if (body.data?.id) createdIds.push(body.data.id);
  }

  // Test 2: User's exact scenario from Screenshot 2 (address: 'delhi', isActive: 'true')
  {
    const formData = new FormData();
    formData.append('startDate', '2026-11-10');
    formData.append('endTime', '2026-11-12');
    formData.append('city', 'test');
    formData.append('address', 'delhi');
    formData.append('postedBy', 'Admin');
    formData.append('description', 'test');
    formData.append('isActive', 'true');
    formData.append('endDate', '2026-11-12');
    formData.append('startTime', '10:00 AM');

    const res = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    const body = await res.json();

    assert(
      res.status === 201 && body.success === true && body.data?.address === 'delhi' && body.data?.isActive === true,
      'Test 2: User Screenshot 2 payload (address: delhi, isActive: "true") creates event successfully',
      `Status: ${res.status}, response: ${JSON.stringify(body)}`
    );
    if (body.data?.id) createdIds.push(body.data.id);
  }

  // Test 3: Standard JSON payload with explicit title & address
  {
    const res = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Jewelry Annual Conference 2026',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        startTime: '09:00 AM',
        endTime: '06:00 PM',
        city: 'Ahmedabad',
        address: 'Science City Road',
        postedBy: 'Admin',
        description: 'Annual flagship event for jewellers',
        isActive: false,
      }),
    });
    const body = await res.json();

    assert(
      res.status === 201 && body.success === true && body.data?.isActive === false,
      'Test 3: JSON payload with isActive: false creates event successfully',
      `Status: ${res.status}, response: ${JSON.stringify(body)}`
    );
    if (body.data?.id) createdIds.push(body.data.id);
  }

  // Test 4: Update event via PUT with string isActive: "true"
  if (createdIds.length > 0) {
    const targetId = createdIds[0];
    const formData = new FormData();
    formData.append('address', 'Updated Address');
    formData.append('isActive', 'true');

    const res = await fetch(`${BASE_URL}/admin/events/${targetId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: formData,
    });
    const body = await res.json();

    assert(
      res.status === 200 && body.success === true && body.data?.address === 'Updated Address' && body.data?.isActive === true,
      'Test 4: PUT /api/admin/events/:id with form-data updates event successfully',
      `Status: ${res.status}, response: ${JSON.stringify(body)}`
    );
  }

  // Cleanup test events
  for (const id of createdIds) {
    await Event.deleteOne({ id });
  }

  await mongoose.disconnect();

  console.log('===========================================================');
  console.log(`🏁 EVENT TESTS RESULT: ${passed}/${total} TESTS PASSED`);
  console.log('===========================================================');

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

