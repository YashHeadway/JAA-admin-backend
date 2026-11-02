import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const BASE_URL = `http://localhost:${env.PORT}${env.API_PREFIX}`;

async function runPaginationTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE 20-ITEM PAGINATION TEST SUITE');
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
    Cookie: `token=${token}`,
  };

  // 1. Members API: User's exact scenario from screenshot: /members?limit=1000
  {
    const res = await fetch(`${BASE_URL}/members?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 1: GET /api/members?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 2. Members API: Default without query params
  {
    const res = await fetch(`${BASE_URL}/members`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 2: GET /api/members (default) keeps 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 3. Committee API: /committee?limit=1000
  {
    const res = await fetch(`${BASE_URL}/committee?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 3: GET /api/committee?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 4. Events API: /events?limit=1000
  {
    const res = await fetch(`${BASE_URL}/events?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 4: GET /api/events?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 5. Groups API: /groups?limit=1000
  {
    const res = await fetch(`${BASE_URL}/groups?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 5: GET /api/groups?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 6. Broadcasts API: /broadcasts?limit=1000
  {
    const res = await fetch(`${BASE_URL}/broadcasts?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 6: GET /api/broadcasts?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 7. Leads API: /leads?limit=1000
  {
    const res = await fetch(`${BASE_URL}/leads?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    const leadsList = Array.isArray(body.data) ? body.data : (body.data?.leads || []);
    assert(
      res.status === 200 &&
        leadsList.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 7: GET /api/leads?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${leadsList.length}`
    );
  }

  // 8. Complaints API: /complaints?limit=1000
  {
    const res = await fetch(`${BASE_URL}/complaints?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 8: GET /api/complaints?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 9. Posts API: /posts?limit=1000
  {
    const res = await fetch(`${BASE_URL}/posts?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 9: GET /api/posts?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  // 10. Admin Profiles API: /admin/profiles?limit=1000
  {
    const res = await fetch(`${BASE_URL}/admin/profiles?limit=1000`, { headers: authHeaders });
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.length <= 20 &&
        body.pagination?.item_per_page === 20,
      'Test 10: GET /api/admin/profiles?limit=1000 enforces 20 count limit per page',
      `Got limit: ${body.pagination?.limit}, items: ${body.data?.length}`
    );
  }

  await mongoose.disconnect();

  console.log('===========================================================');
  console.log(`🏁 20-PAGINATION TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('===========================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPaginationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

