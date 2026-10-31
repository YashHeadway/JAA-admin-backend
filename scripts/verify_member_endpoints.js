import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

const BASE_URL = 'http://localhost:5000/api';

const token = jwt.sign(
  {
    id: 1,
    name: 'Admin',
    email: 'admin@gmail.com',
    role: 'Admin',
  },
  env.JWT_SECRET,
  { expiresIn: '1h' }
);

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function testEndpoints() {
  console.log('Testing Member APIs with JWT Token...');

  // 1. GET /api/members
  const res1 = await fetch(`${BASE_URL}/members`, { headers });
  const data1 = await res1.json();
  console.log('GET /api/members status:', res1.status);
  const m18 = data1.data?.find((m) => m.id === 18);
  console.log('Member 18 from GET /api/members:\n', JSON.stringify(m18, null, 2));

  // 2. GET /api/admin/members
  const res2 = await fetch(`${BASE_URL}/admin/members`, { headers });
  const data2 = await res2.json();
  console.log('\nGET /api/admin/members status:', res2.status);
  const adminM18 = data2.data?.find((m) => m.id === 18);
  console.log('Member 18 matches admin endpoint:', JSON.stringify(adminM18) === JSON.stringify(m18));

  // 3. GET /api/members/18
  const res3 = await fetch(`${BASE_URL}/members/18`, { headers });
  const data3 = await res3.json();
  console.log('\nGET /api/members/18 status:', res3.status);
  console.log('Member 18 direct detail:\n', JSON.stringify(data3.data, null, 2));

  // 4. GET /api/members/18/id-card
  const res4 = await fetch(`${BASE_URL}/members/18/id-card`, { headers });
  const data4 = await res4.json();
  console.log('\nGET /api/members/18/id-card status:', res4.status);
  console.log('Member 18 ID card response:\n', JSON.stringify(data4, null, 2));

  // 5. GET /api/admin/members/18/idcard
  const res5 = await fetch(`${BASE_URL}/admin/members/18/idcard`, { headers });
  const data5 = await res5.json();
  console.log('\nGET /api/admin/members/18/idcard status:', res5.status);
  console.log('Matches /idcard alias:', data5.success === true);

  // 6. Test POST /api/members (create member and check auto-generated idCard)
  const testNewMember = {
    name: 'Auto Card Member',
    business: 'Jewel Card Studio',
    mobile: '9998887776',
    email: `cardmember_${Date.now()}@example.com`,
    city: 'Ahmedabad',
    businessType: 'Wholesaler',
    status: 'approved',
  };
  const res6 = await fetch(`${BASE_URL}/members`, {
    method: 'POST',
    headers,
    body: JSON.stringify(testNewMember),
  });
  const data6 = await res6.json();
  console.log('\nPOST /api/members status:', res6.status);
  console.log('Newly created member with auto-generated idCard:\n', JSON.stringify(data6.data, null, 2));

  // Clean up the created test member so DB stays clean
  if (data6.data && data6.data.id) {
    const resDel = await fetch(`${BASE_URL}/members/${data6.data.id}`, {
      method: 'DELETE',
      headers,
    });
    console.log(`Cleaned up temporary test member #${data6.data.id}, status:`, resDel.status);
  }
}

testEndpoints().catch(console.error);

