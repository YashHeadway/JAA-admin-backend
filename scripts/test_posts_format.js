import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Post } from '../src/models/Post.js';

const BASE_URL = `http://localhost:${env.PORT}${env.API_PREFIX}`;

async function run() {
  console.log('===========================================================');
  console.log('🧪 VERIFYING POSTS API WITH EXACT "postedBy" FORMAT');
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
    {
      id: 1,
      userId: 1,
      email: 'admin@jaa.com',
      role: 'Super Admin',
    },
    env.JWT_SECRET || 'jwt_super_secret_for_jaa_admin_2026_production',
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // TEST 1: GET /api/admin/posts/:id on Post #12 (Confirm exact user requested format)
  console.log('\n--- 1. Testing GET /api/admin/posts/12 ---');
  const post12Res = await fetch(`${BASE_URL}/admin/posts/12`, { headers });
  const post12Json = await post12Res.json();
  assert(post12Res.status === 200, 'GET /admin/posts/12 returns 200 OK');
  assert(post12Json.success === true, 'Response has success: true');
  const d12 = post12Json.data;

  assert(d12?.id === 12, 'Post 12 id is 12');
  assert(d12?.title === 'AGM 2026 Official Notice', 'Post 12 title matches');
  assert(d12?.description === 'Annual General Meeting circular for all members.', 'Post 12 description matches');
  assert(Array.isArray(d12?.media), 'Post 12 has media array');
  assert(d12?.media?.length === 2, 'Post 12 has 2 media items');
  assert(d12?.media?.[0]?.url === '/uploads/jaa-logo.png', 'Media 0 url matches /uploads/jaa-logo.png');
  assert(d12?.media?.[0]?.fileType === 'image/png', 'Media 0 fileType matches image/png');
  assert(d12?.media?.[1]?.url === '/uploads/agm-video.mp4', 'Media 1 url matches /uploads/agm-video.mp4');
  assert(d12?.media?.[1]?.fileType === 'video/mp4', 'Media 1 fileType matches video/mp4');
  assert(d12?.location === 'Ahmedabad', 'Post 12 location is Ahmedabad');
  assert(d12?.allowComments === true, 'Post 12 allowComments is true');
  assert(d12?.isPinned === true, 'Post 12 isPinned is true');

  // postedBy structure assertions
  assert(typeof d12?.postedBy === 'object', 'Post 12 has postedBy object');
  assert(d12?.postedBy?.role === 'admin', 'postedBy.role is admin');
  assert(d12?.postedBy?.admin?.id === 1, 'postedBy.admin.id is 1');
  assert(d12?.postedBy?.admin?.name === 'JAA Admin', 'postedBy.admin.name is JAA Admin');
  assert(d12?.postedBy?.admin?.email === 'admin@jaa.com', 'postedBy.admin.email is admin@jaa.com');
  assert(d12?.postedBy?.admin?.avatar === '/uploads/admin-profile.png', 'postedBy.admin.avatar is /uploads/admin-profile.png');
  assert(d12?.member === undefined, 'Top-level member field is omitted/cleaned up');
  assert(d12?.status === 'published', 'Post 12 status is published');
  assert(d12?.createdAt !== undefined, 'Post 12 has createdAt');
  assert(d12?.updatedAt !== undefined, 'Post 12 has updatedAt');

  console.log('\nGET /api/admin/posts/12 output:\n', JSON.stringify(post12Json, null, 2));

  // TEST 2: POST /api/admin/posts - test creation with exact user format
  console.log('\n--- 2. Testing POST /api/admin/posts (Exact Creation Response) ---');
  const newPayload = {
    title: 'AGM 2026 Official Notice',
    description: 'Annual General Meeting circular for all members.',
    media: [
      {
        url: '/uploads/jaa-logo.png',
        fileType: 'image/png',
      },
      {
        url: '/uploads/agm-video.mp4',
        fileType: 'video/mp4',
      },
    ],
    location: 'Ahmedabad',
    allowComments: true,
    isPinned: true,
    postedBy: {
      role: 'admin',
      admin: {
        id: 1,
        name: 'JAA Admin',
        email: 'admin@jaa.com',
        avatar: '/uploads/admin-profile.png',
      },
    },
  };

  const createRes = await fetch(`${BASE_URL}/admin/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newPayload),
  });
  const createJson = await createRes.json();
  assert(createRes.status === 201, 'POST /admin/posts returns 201 Created');
  assert(createJson.success === true, 'Response has success: true');
  assert(createJson.message === 'Post created successfully', 'Response message is "Post created successfully"');

  const createdPost = createJson.data;
  assert(createdPost?.title === 'AGM 2026 Official Notice', 'Created post title matches');
  assert(createdPost?.description === 'Annual General Meeting circular for all members.', 'Created post description matches');
  assert(createdPost?.media?.length === 2, 'Created post has 2 media items');
  assert(createdPost?.location === 'Ahmedabad', 'Created post location is Ahmedabad');
  assert(createdPost?.allowComments === true, 'Created post allowComments is true');
  assert(createdPost?.isPinned === true, 'Created post isPinned is true');
  assert(createdPost?.postedBy?.role === 'admin', 'Created post postedBy.role is admin');
  assert(createdPost?.postedBy?.admin?.id === 1, 'Created post postedBy.admin.id is 1');
  assert(createdPost?.postedBy?.admin?.name === 'JAA Admin', 'Created post postedBy.admin.name is JAA Admin');
  assert(createdPost?.postedBy?.admin?.email === 'admin@jaa.com', 'Created post postedBy.admin.email is admin@jaa.com');
  assert(createdPost?.postedBy?.admin?.avatar === '/uploads/admin-profile.png', 'Created post postedBy.admin.avatar matches');
  assert(createdPost?.status === 'published', 'Created post status is published');
  assert(createdPost?.createdAt !== undefined, 'Created post has createdAt');
  assert(createdPost?.updatedAt !== undefined, 'Created post has updatedAt');

  console.log('\nCreated Post response:\n', JSON.stringify(createJson, null, 2));

  // TEST 3: GET /api/admin/posts - verify list endpoint uses postedBy and index [0] media
  console.log('\n--- 3. Testing GET /api/admin/posts (List format) ---');
  const listRes = await fetch(`${BASE_URL}/admin/posts?limit=5`, { headers });
  const listJson = await listRes.json();
  assert(listRes.status === 200, 'GET /admin/posts returns 200 OK');
  assert(Array.isArray(listJson.data), 'List endpoint returns data array');

  const firstListPost = listJson.data?.[0];
  assert(!!firstListPost, 'At least 1 post found in list');
  assert(firstListPost?.id !== undefined, 'List post has id');
  assert(firstListPost?.title !== undefined, 'List post has title');
  assert(firstListPost?.media?.length <= 1, 'List post media contains ONLY index [0]');
  assert(firstListPost?.postedBy !== undefined, 'List post has postedBy');
  assert(firstListPost?.postedBy?.role === 'admin', 'List post postedBy.role is admin');
  assert(firstListPost?.postedBy?.admin?.name === 'JAA Admin', 'List post postedBy.admin.name is JAA Admin');
  assert(firstListPost?.createdAt !== undefined, 'List post has createdAt');
  assert(firstListPost?.status === 'published' || firstListPost?.status === 'draft', 'List post has valid status');
  assert(firstListPost?.description === undefined, 'List post omits description');
  assert(firstListPost?.location === undefined, 'List post omits location');
  assert(firstListPost?.allowComments === undefined, 'List post omits allowComments');
  assert(firstListPost?.isPinned === undefined, 'List post omits isPinned');
  assert(firstListPost?.member === undefined, 'List post omits top-level member');

  // CLEANUP: Delete the created test post
  if (createdPost?.id && createdPost.id !== 12) {
    const delRes = await fetch(`${BASE_URL}/admin/posts/${createdPost.id}`, {
      method: 'DELETE',
      headers,
    });
    console.log(`Cleaned up test post #${createdPost.id}, status: ${delRes.status}`);
  }

  await mongoose.disconnect();

  console.log('\n===========================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('===========================================================');

  process.exit(total - passed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
