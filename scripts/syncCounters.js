import { connectDB } from '../src/config/db.js';
import mongoose from 'mongoose';
import { Counter } from '../src/models/Counter.js';

const SEQUENCE_MAP = {
  committees: 'committees',
  members: 'members',
  events: 'events',
  groups: 'groups',
  broadcasts: 'broadcasts',
  leads: 'leads',
  complaints: 'complaints',
  posts: 'posts',
  users: 'users',
  'admin-users': 'admin_users',
  admin_profiles: 'admin_profiles',
};

async function sync() {
  await connectDB();
  const db = mongoose.connection.db;

  console.log('--- Synchronizing all sequence counters with collection max IDs ---');

  for (const [seqName, collName] of Object.entries(SEQUENCE_MAP)) {
    try {
      const coll = db.collection(collName);
      const topDocs = await coll.find({ id: { $exists: true } }).sort({ id: -1 }).limit(1).toArray();
      const maxId = topDocs.length > 0 && typeof topDocs[0].id === 'number' ? topDocs[0].id : 0;
      
      const currentCounter = await Counter.findById(seqName);
      const currentSeq = currentCounter ? currentCounter.seq : 0;
      const targetSeq = Math.max(maxId, currentSeq);

      await Counter.findByIdAndUpdate(
        seqName,
        { $set: { seq: targetSeq } },
        { upsert: true, returnDocument: 'after' }
      );

      console.log(`✓ ${seqName.padEnd(16)} (coll: ${collName.padEnd(16)}) -> maxId: ${String(maxId).padEnd(4)} synced seq to: ${targetSeq}`);
    } catch (err) {
      console.error(`✗ Error syncing ${seqName}:`, err.message);
    }
  }

  console.log('--- All counters synchronized successfully ---');
  process.exit(0);
}

sync();
