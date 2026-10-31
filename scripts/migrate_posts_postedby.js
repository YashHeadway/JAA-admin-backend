import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Post } from '../src/models/Post.js';

async function run() {
  await mongoose.connect(env.MONGO_URI);

  const defaultAdmin = {
    id: 1,
    name: 'JAA Admin',
    email: 'admin@jaa.com',
    avatar: '/uploads/admin-profile.png',
  };

  // 1. Update all existing posts to have postedBy
  const posts = await Post.find({});
  console.log(`Found ${posts.length} posts to sync...`);

  for (const post of posts) {
    if (!post.postedBy || !post.postedBy.role) {
      if (post.title && post.title.toLowerCase().includes('agm')) {
        post.postedBy = {
          role: 'admin',
          admin: defaultAdmin,
        };
      } else if (post.member && post.member.id) {
        post.postedBy = {
          role: 'member',
          member: {
            id: post.member.id,
            membershipId: post.member.membershipId || 'JBAD168',
            name: post.member.name || 'testt',
            business: post.member.business || 'test',
            mobile: post.member.mobile || '9737126164',
            avatar: post.member.avatar || '/uploads/jaa-logo-1792992678372.png',
          },
        };
      } else {
        post.postedBy = {
          role: 'admin',
          admin: defaultAdmin,
        };
      }
    }
    // Also remove top-level member
    post.set('member', undefined);
    await post.save();
    console.log(`Synced post #${post.id} with postedBy (${post.postedBy.role})`);
  }

  // 2. Ensure Post 12 exists with exact user example data if not already present
  let post12 = await Post.findOne({ id: 12 });
  if (!post12) {
    post12 = await Post.create({
      id: 12,
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
      status: 'published',
      postedBy: {
        role: 'admin',
        admin: defaultAdmin,
      },
    });
    console.log('Created post #12 matching user specification');
  } else {
    post12.title = 'AGM 2026 Official Notice';
    post12.description = 'Annual General Meeting circular for all members.';
    post12.media = [
      {
        url: '/uploads/jaa-logo.png',
        fileType: 'image/png',
      },
      {
        url: '/uploads/agm-video.mp4',
        fileType: 'video/mp4',
      },
    ];
    post12.location = 'Ahmedabad';
    post12.allowComments = true;
    post12.isPinned = true;
    post12.status = 'published';
    post12.postedBy = {
      role: 'admin',
      admin: defaultAdmin,
    };
    await post12.save();
    console.log('Updated post #12 matching user specification');
  }

  await mongoose.disconnect();
  console.log('Migration finished successfully.');
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});

