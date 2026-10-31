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

async function testLeadsApi() {
  console.log('=== TESTING LEADS API WITH NUMERIC ID & MEMBER OBJECT ===\n');

  // 1. GET /api/leads
  console.log('1. Testing GET /api/leads:');
  const res1 = await fetch(`${BASE_URL}/leads`, { headers });
  const data1 = await res1.json();
  console.log('Status:', res1.status);
  console.log('Response:\n', JSON.stringify(data1, null, 2));

  // 2. GET /api/leads/1
  console.log('\n2. Testing GET /api/leads/1 (Single Lead by numeric ID):');
  const res2 = await fetch(`${BASE_URL}/leads/1`, { headers });
  const data2 = await res2.json();
  console.log('Status:', res2.status);
  console.log('Response:\n', JSON.stringify(data2, null, 2));

  // 3. POST /api/leads with numeric memberId: 18
  console.log('\n3. Testing POST /api/leads with memberId: 18:');
  const newLeadPayload = {
    memberId: 18,
    title: 'Diamond Polisher Urgently Required',
    description: 'Looking for experienced diamond polisher in Manek Chowk.',
    image: 'https://yourdomain.com/uploads/diamond-polisher.jpg',
    status: 'ACTIVE',
  };
  const res3 = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newLeadPayload),
  });
  const data3 = await res3.json();
  console.log('Status:', res3.status);
  console.log('Created Lead Response:\n', JSON.stringify(data3, null, 2));

  // 4. Clean up temporary test lead
  if (data3.data?.id) {
    const resDel = await fetch(`${BASE_URL}/leads/${data3.data.id}`, {
      method: 'DELETE',
      headers,
    });
    const dataDel = await resDel.json();
    console.log(`\nCleaned up test lead #${data3.data.id}: status ${resDel.status}, response:`, JSON.stringify(dataDel));
  }
}

testLeadsApi().catch(console.error);
