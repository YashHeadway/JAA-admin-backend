import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Get next auto-incrementing sequential integer ID (1, 2, 3...)
 * @param {string} sequenceName (e.g. 'members', 'events', 'broadcasts')
 * @returns {Promise<number>}
 */
export const getNextSequence = async (sequenceName) => {
  const result = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return result.seq;
};
