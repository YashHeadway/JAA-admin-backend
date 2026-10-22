import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { Member } from '../models/Member.js';
import { Committee } from '../models/Committee.js';
import { Event } from '../models/Event.js';
import { Group } from '../models/Group.js';
import { Broadcast } from '../models/Broadcast.js';
import { Lead } from '../models/Lead.js';
import { Complaint } from '../models/Complaint.js';
import { Post } from '../models/Post.js';
import { Counter } from '../models/Counter.js';

import { AdminUser } from '../models/AdminUser.js';

const runInit = async () => {
  try {
    logger.info(`Connecting to MongoDB ${env.MONGO_URI}...`);
    await mongoose.connect(env.MONGO_URI);
    const db = mongoose.connection.db;

    logger.info('Connected to MongoDB JAA_Backend. Initializing collections...');

    const models = [
      AdminUser,
      User,
      Member,
      Committee,
      Event,
      Group,
      Broadcast,
      Lead,
      Complaint,
      Post,
      Counter,
    ];

    for (const model of models) {
      await model.init();
      const collectionName = model.collection.name;
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        await db.createCollection(collectionName);
      }
    }

    const maxAdminDoc = await AdminUser.findOne().sort({ id: -1 });
    const currentMaxAdminSeq = maxAdminDoc && maxAdminDoc.id ? maxAdminDoc.id : 0;
    await Counter.findByIdAndUpdate(
      'admin-users',
      { $max: { seq: currentMaxAdminSeq } },
      { upsert: true }
    );

    const maxUserDoc = await User.findOne().sort({ id: -1 });
    const currentMaxSeq = maxUserDoc && maxUserDoc.id ? maxUserDoc.id : 0;
    await Counter.findByIdAndUpdate(
      'users',
      { $max: { seq: currentMaxSeq } },
      { upsert: true }
    );



    logger.info('✅ JAA_Backend database and collections are completely ready in MongoDB Compass!');
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Initialization failed: ${error.message}`);
    process.exit(1);
  }
};

runInit();
