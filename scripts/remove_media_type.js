import { connectDB } from '../src/config/db.js';
import { Post } from '../src/models/Post.js';

async function run() {
  await connectDB();
  const res = await Post.updateMany({}, { $unset: { mediaType: 1 } });
  console.log('Unset mediaType result:', res);

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

