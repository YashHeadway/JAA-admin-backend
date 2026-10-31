import { connectDB } from '../src/config/db.js';
import { Member } from '../src/models/Member.js';
import { Post } from '../src/models/Post.js';
import { formatMemberSnapshot } from '../src/services/postService.js';
import mongoose from 'mongoose';

async function run() {
  await connectDB();

  // 1. Delete artificial dummy member Harvey Specter
  const delResult = await Member.deleteMany({
    $or: [
      { id: 19 },
      { name: 'Harvey Specter' },
      { _id: new mongoose.Types.ObjectId('690123456789abcdef123001') },
    ],
  });
  console.log('Deleted dummy members count:', delResult.deletedCount);

  // 2. Fetch real member 18
  const member18 = await Member.findOne({ id: 18 });
  if (!member18) {
    console.error('Member 18 not found in DB!');
    process.exit(1);
  }
  console.log('Found real Member 18:', {
    _id: member18._id.toString(),
    id: member18.id,
    membershipId: member18.membershipId,
    name: member18.name,
    business: member18.business,
  });

  const memberSnapshot = formatMemberSnapshot(member18);
  console.log('Member 18 snapshot for posts:', memberSnapshot);

  // 3. Update existing posts
  const posts = await Post.find({});
  for (const p of posts) {
    await Post.updateOne(
      { _id: p._id },
      {
        $set: {
          member: memberSnapshot,
        },
      }
    );
  }
  console.log(`Updated ${posts.length} posts with real Member 18 data.`);

  // 4. Verify posts
  const updatedPosts = await Post.find({});
  for (const up of updatedPosts) {
    console.log(`Post ${up.id}:`, JSON.stringify(up.toJSON(), null, 2));
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

