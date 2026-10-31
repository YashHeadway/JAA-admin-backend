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
        p.page === 1 &&
        p.limit === 20 &&
        p.hasPrev === false &&
        typeof p.total === 'number' &&
        typeof p.totalPages === 'number',
      'Test 1: GET /api/admin/members?page=1&limit=20 returns clean data array without duplicate members key',
      `Got page: ${p.page}, limit: ${p.limit}, items: ${items.length}, total: ${p.total}, hasDuplicateMembersKey: ${body.members !== undefined}`
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
        p.page === 1 &&
        p.limit === 20,
      'Test 2: GET /api/admin/members defaults to page=1 and limit=20',
      `Got page: ${p.page}, limit: ${p.limit}`
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
      res.status === 200 && allApproved && p.total === body.counts?.approved,
      'Test 3: Status filter applies consistently to items and pagination total',
      `Total: ${p.total}, approved count: ${body.counts?.approved}`
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
      res.status === 200 && allMatch && p.total === items.length,
      'Test 4: Search filter correctly applies to both query and countDocuments',
      `Total: ${p.total}, items: ${items.length}`
    );
  }

  // 5. Invalid query parameters safely handled: page=0&limit=0
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=0&limit=0`, { headers: authHeaders });
    const body = await res.json();
    const p = body.pagination || {};

    assert(
      res.status === 200 && p.page === 1 && p.limit === 20,
      'Test 5a: Invalid page=0 and limit=0 safely fallback to page=1 and limit=20',
      `Got page: ${p.page}, limit: ${p.limit}`
    );
  }

  // 5b. Invalid negative / string parameters
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=-5&limit=abc`, { headers: authHeaders });
    const body = await res.json();
    const p = body.pagination || {};

    assert(
      res.status === 200 && p.page === 1 && p.limit === 20,
      'Test 5b: Negative page and non-numeric limit safely fallback to page=1 and limit=20',
      `Got page: ${p.page}, limit: ${p.limit}`
    );
  }

  // 6. Enforce maximum page size limit of 100
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=1&limit=1000`, { headers: authHeaders });
    const body = await res.json();
    const p = body.pagination || {};

    assert(
      res.status === 200 && p.limit === 100,
      'Test 6: Requesting limit=1000 is safely capped at maximum 100',
      `Got limit: ${p.limit}`
    );
  }

  // 7. Page beyond total available pages
  {
    const res = await fetch(`${BASE_URL}/admin/members?page=9999&limit=20`, { headers: authHeaders });
    const body = await res.json();
    const items = body.data || [];
    const p = body.pagination || {};

    assert(
      res.status === 200 && Array.isArray(items) && items.length === 0 && p.page === 9999 && p.hasNext === false && p.hasPrev === true,
      'Test 7: Out-of-bounds page returns empty array without crashing',
      `Items: ${items.length}, hasNext: ${p.hasNext}`
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

