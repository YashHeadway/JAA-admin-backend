import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const SEQUENCE_COLLECTION_MAP = {
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

/**
 * Get next auto-incrementing sequential integer ID (1, 2, 3...)
 * Automatically synchronizes with the collection's highest ID to prevent E11000 duplicate key errors.
 * @param {string} sequenceName (e.g. 'committees', 'members', 'events')
 * @returns {Promise<number>}
 */
export const getNextSequence = async (sequenceName) => {
  let maxExistingId = 0;

  try {
    const collName = SEQUENCE_COLLECTION_MAP[sequenceName] || sequenceName;
    if (mongoose.connection && mongoose.connection.db) {
      const coll = mongoose.connection.db.collection(collName);
      if (coll) {
        const topDoc = await coll.find({ id: { $exists: true } }).sort({ id: -1 }).limit(1).toArray();
        if (topDoc.length > 0 && typeof topDoc[0].id === 'number') {
          maxExistingId = topDoc[0].id;
        }
      }
    }
  } catch {
    // If collection lookup fails, continue with Counter document
  }

  const currentCounter = await Counter.findById(sequenceName);
  let currentSeq = currentCounter ? currentCounter.seq : 0;

  if (currentSeq < maxExistingId) {
    currentSeq = maxExistingId;
  }

  const nextSeq = currentSeq + 1;

  await Counter.findByIdAndUpdate(
    sequenceName,
    { $set: { seq: nextSeq } },
    { upsert: true, returnDocument: 'after' }
  );

  return nextSeq;
};
