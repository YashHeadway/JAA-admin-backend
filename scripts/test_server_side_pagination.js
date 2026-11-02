import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const BASE_URL = `http://localhost:${env.PORT}${env.API_PREFIX}`;

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING SERVER-SIDE MEMBERS PAGINATION VERIFICATION');
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

  // 1. GET /api/admin/members?page=1&limit=20
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=1&limit=20`, { headers: authHeaders });
    const body = await res.json();

    const isSuccess = res.status === 200 && body.success === true;
    const items = body.data || [];
    const p = body.pagination || {};

    assert(
      isSuccess &&
        Array.isArray(body.data) &&
        body.members === undefined &&
        items.length <= 20 &&
        p.current_page === 1 &&
        p.item_per_page === 20 &&
        p.has_more !== undefined &&
        typeof p.total_items === 'number' &&
        typeof p.total_page === 'number',
      'Test 1: GET /api/admin/members?page=1&limit=20 returns clean data array without duplicate members key',
      `Got current_page: ${p.current_page}, item_per_page: ${p.item_per_page}, items: ${items.length}, total_items: ${p.total_items}, hasDuplicateMembersKey: ${body.members !== undefined}`
    );
  }

  // 2. Default request: GET /api/admin/members (without query params) defaults to page=1, limit=20
  {
    const res = await fetch(`${BASE_URL}/admin/members`, { headers: authHeaders });
    const body = await res.json();
    const items = body.data || [];
    const p = body.pagination || {};

    assert(
      res.status === 200 &&
        items.length <= 20 &&
        p.current_page === 1 &&
        p.item_per_page === 20,
      'Test 2: GET /api/admin/members defaults to page=1 and limit=20',
      `Got current_page: ${p.current_page}, item_per_page: ${p.item_per_page}`
    );
  }

  // 3. Status filter: GET /api/admin/members?page=1&limit=20&status=approved
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=1&limit=20&status=approved`, { headers: authHeaders });
    const body = await res.json();
    const items = body.data || [];
    const p = body.pagination || {};
    const allApproved = items.every((m) => m.status.toLowerCase() === 'approved');

    assert(
      res.status === 200 && allApproved && p.total_items === body.counts?.approved,
      'Test 3: Status filter applies consistently to items and pagination total',
      `Total: ${p.total_items}, approved count: ${body.counts?.approved}`
    );
  }

  // 4. Search query: GET /api/admin/members?page=1&limit=20&search=yash
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=1&limit=20&search=yash`, { headers: authHeaders });
    const body = await res.json();
    const items = body.data || [];
    const p = body.pagination || {};
    const allMatch = items.every((m) =>
      m.name?.toLowerCase().includes('yash') ||
      m.business?.toLowerCase().includes('yash') ||
      m.email?.toLowerCase().includes('yash')
    );

    assert(
      res.status === 200 && allMatch && p.total_items === items.length,
      'Test 4: Search filter correctly applies to both query and countDocuments',
      `Total: ${p.total_items}, items: ${items.length}`
    );
  }

  // 5. Invalid query parameters safely handled: page=0&limit=0
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=0&limit=0`, { headers: authHeaders });
    const body = await res.json();
    const p = body.pagination || {};

    assert(
      res.status === 200 && p.current_page === 1 && p.item_per_page === 20,
      'Test 5a: Invalid page=0 and limit=0 safely fallback to page=1 and limit=20',
      `Got current_page: ${p.current_page}, item_per_page: ${p.item_per_page}`
    );
  }

  // 5b. Invalid negative / string parameters
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=-5&limit=abc`, { headers: authHeaders });
    const body = await res.json();
    const p = body.pagination || {};

    assert(
      res.status === 200 && p.current_page === 1 && p.item_per_page === 20,
      'Test 5b: Negative page and non-numeric limit safely fallback to page=1 and limit=20',
      `Got current_page: ${p.current_page}, item_per_page: ${p.item_per_page}`
    );
  }

  // 6. Enforce maximum page size limit of 100
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=1&limit=1000`, { headers: authHeaders });
    const body = await res.json();
    const p = body.pagination || {};

    assert(
      res.status === 200 && (p.item_per_page === 20 || p.item_per_page === 100),
      'Test 6: Requesting limit=1000 is safely capped',
      `Got limit: ${p.item_per_page}`
    );
  }

  // 7. Page beyond total available pages
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=9999&limit=20`, { headers: authHeaders });
    const body = await res.json();
    const items = body.data || [];
    const p = body.pagination || {};

    assert(
      res.status === 200 && Array.isArray(items) && items.length === 0 && p.current_page === 9999 && p.has_more === false,
      'Test 7: Out-of-bounds page returns empty array without crashing',
      `Items: ${items.length}, has_more: ${p.has_more}`
    );
  }

  await mongoose.disconnect();

  console.log('===========================================================');
  console.log(`🏁 SERVER-SIDE PAGINATION RESULTS: ${passed}/${total} TESTS PASSED`);
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

