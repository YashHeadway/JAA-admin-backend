import { connectDB } from '../src/config/db.js';
import { Post } from '../src/models/Post.js';
import { Member } from '../src/models/Member.js';

async function run() {
  await connectDB();
  const member18 = await Member.findOne({ id: 18 });
  if (!member18) {
    console.error('Member 18 not found!');
    process.exit(1);
  }

  const cleanMember = {
    id: member18.id,
    membershipId: member18.membershipId,
    name: member18.name,
    business: member18.business,
    mobile: member18.mobile,
  };

  console.log('Clean member snapshot:', cleanMember);

  await Post.updateMany(
    {},
    {
      $set: { member: cleanMember },
      $unset: { mediaType: 1 },
    }
  );

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

