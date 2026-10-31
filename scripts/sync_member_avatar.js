import { connectDB } from '../src/config/db.js';
import { Member } from '../src/models/Member.js';
import { Post } from '../src/models/Post.js';

async function run() {
  await connectDB();

  // 1. Update Member 18 with avatar
  const avatarUrl = '/uploads/jaa-logo-1792992678372.png';
  const updatedMember18 = await Member.findOneAndUpdate(
    { id: 18 },
    { $set: { avatar: avatarUrl } },
    { returnDocument: 'after' }
  );

  console.log('Updated Member 18:', {
    id: updatedMember18.id,
    name: updatedMember18.name,
    avatar: updatedMember18.avatar,
  });

  // 2. Update all posts in MongoDB with member 18's new avatar
  const cleanMember = {
    id: updatedMember18.id,
    membershipId: updatedMember18.membershipId,
    name: updatedMember18.name,
    business: updatedMember18.business,
    mobile: updatedMember18.mobile,
    avatar: updatedMember18.avatar,
  };

  await Post.updateMany(
    {},
    {
      $set: { member: cleanMember },
      $unset: { mediaType: 1 },
    }
  );

  console.log('Updated posts in MongoDB. Verifying:');
  const posts = await Post.find({});
  for (const p of posts) {
    console.log(`POST #${p.id}:`, JSON.stringify(p.toJSON(), null, 2));
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

