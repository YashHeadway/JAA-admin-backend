import { connectDB } from '../src/config/db.js';
import { Post } from '../src/models/Post.js';

async function run() {
  await connectDB();

  // 1. Clean existing posts in MongoDB
  const posts = await Post.find({});
  for (const p of posts) {
    const allowComments = p.allowComments !== undefined ? p.allowComments : (p.allowcomments ?? true);
    const isPinned = p.isPinned !== undefined ? p.isPinned : (p.ispinned ?? false);
    const status = (p.status || 'published').toLowerCase();

    await Post.updateOne(
      { _id: p._id },
      {
        $set: {
          allowComments,
          isPinned,
          status,
        },
        $unset: {
          allowcomments: 1,
          ispinned: 1,
          mediaType: 1,
        },
      }
    );
  }

  console.log(`Updated ${posts.length} posts.`);

  // 2. Verify all posts in MongoDB
  const updatedPosts = await Post.find({});
  for (const up of updatedPosts) {
    console.log(`POST #${up.id}:`, JSON.stringify(up.toJSON(), null, 2));
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

