import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';
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

import { formatDateTime } from '../utils/dateFormatter.js';

// Apply global transform so no model leaks _id or __v in JSON responses, and formats timestamps
mongoose.plugin((schema) => {
  schema.set('toJSON', {
    virtuals: false,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
      if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
      return ret;
    },
  });
  schema.set('toObject', {
    virtuals: false,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
      if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
      return ret;
    },
  });
});

import { AdminUser } from '../models/AdminUser.js';

let isConnected = false;

const ensureCollectionsAndAdmin = async () => {
  try {
    const db = mongoose.connection.db;

    // Ensure all tables/collections exist in MongoDB Compass under JAA_Backend (including admin-users)
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

    // Synchronize Counter sequence for admin-users
    const maxAdminDoc = await AdminUser.findOne().sort({ id: -1 });
    const currentMaxAdminSeq = maxAdminDoc && maxAdminDoc.id ? maxAdminDoc.id : 0;
    await Counter.findByIdAndUpdate(
      'admin-users',
      { $max: { seq: currentMaxAdminSeq } },
      { upsert: true }
    );

    // Synchronize Counter sequence for users
    const maxUserDoc = await User.findOne().sort({ id: -1 });
    const currentMaxSeq = maxUserDoc && maxUserDoc.id ? maxUserDoc.id : 0;
    await Counter.findByIdAndUpdate(
      'users',
      { $max: { seq: currentMaxSeq } },
      { upsert: true }
    );

    // Synchronize Counter sequence for admin_profiles
    const { AdminProfile } = await import('../models/AdminProfile.js');
    const maxProfileDoc = await AdminProfile.findOne().sort({ id: -1 });
    const currentMaxProfileSeq = maxProfileDoc && maxProfileDoc.id ? maxProfileDoc.id : 0;
    await Counter.findByIdAndUpdate(
      'admin_profiles',
      { $max: { seq: currentMaxProfileSeq } },
      { upsert: true }
    );

    // Auto-sync AdminProfile for all admin users
    try {
      const { AdminProfileService } = await import('../services/adminProfileService.js');
      await AdminProfileService.syncExistingAdminProfiles();
    } catch (syncErr) {
      logger.warn(`Admin profile sync note: ${syncErr.message}`);
    }

    logger.info('📊 All collections verified and ready in MongoDB Compass (JAA_Backend).');
  } catch (err) {
    logger.warn(`⚠️ Collection initialization note: ${err.message}`);
  }
};



export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    logger.info(`✅ MongoDB Connected to: ${conn.connection.name} at ${conn.connection.host}`);
    
    // Create collections and admin user if needed
    await ensureCollectionsAndAdmin();
    return true;
  } catch (error) {
    logger.error(`❌ MongoDB connection failed: ${error.message}`);
    isConnected = false;
    return false;
  }
};

export const getDbStatus = () => ({
  isConnected,
  database: 'JAA_Backend',
  mode: isConnected ? 'MongoDB (JAA_Backend)' : 'Disconnected',
});
