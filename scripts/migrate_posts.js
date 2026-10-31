import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { getMimeType } from '../src/services/postService.js';

async function migrate() {
  await mongoose.connect(env.MONGO_URI);
  const db = mongoose.connection.db;
  const rawPosts = await db.collection('posts').find({}).toArray();
  console.log('Raw posts to migrate:', rawPosts.length);

  const harveyId = new mongoose.Types.ObjectId('690123456789abcdef123001');

  for (const p of rawPosts) {
    let mediaArray = [];
    if (typeof p.media === 'string') {
      mediaArray = [{ url: p.media, fileType: getMimeType(p.media) }];
    } else if (Array.isArray(p.media)) {
      mediaArray = p.media.map((m) =>
        typeof m === 'string' ? { url: m, fileType: getMimeType(m) } : m
      );
    } else {
      mediaArray = [
        { url: 'https://cdn.example.com/posts/event-image.jpg', fileType: 'image/jpeg' },
      ];
    }

    const memberObj =
      p.member && p.member.memberId
        ? p.member
        : {
            memberId: harveyId,
            name: 'Harvey Specter',
            business: 'Harvey Specter Legal Services',
          };

    await db.collection('posts').updateOne(
      { _id: p._id },
      {
        $set: {
          media: mediaArray,
          member: memberObj,
          allowcomments:
            p.allowcomments !== undefined ? p.allowcomments : p.allowComments ?? true,
          allowComments:
            p.allowComments !== undefined ? p.allowComments : p.allowcomments ?? true,
          ispinned: p.ispinned !== undefined ? p.ispinned : p.isPinned ?? false,
          isPinned: p.isPinned !== undefined ? p.isPinned : p.ispinned ?? false,
        },
      }
    );
  }

  const updatedPosts = await db.collection('posts').find({}).toArray();
  console.log('Migrated successfully. First post:', JSON.stringify(updatedPosts[0], null, 2));

  await mongoose.disconnect();
}

migrate().catch(console.error);

