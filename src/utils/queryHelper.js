import mongoose from 'mongoose';

/**
 * Builds a safe MongoDB query for identifying a document by either its
 * sequential numeric index ID (1, 2, 3...) or its 24-char ObjectId string.
 * Prevents CastError on non-ObjectId strings like "1", "2".
 *
 * @param {string | number} id
 * @returns {object}
 */
export const buildIdQuery = (id) => {
  if (id === null || id === undefined) return { id: -1 };
  const str = String(id).trim();

  // 24-char hex string is a MongoDB ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return { $or: [{ _id: str }, { membershipId: str }] };
  }

  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    return { $or: [{ id: num }, { membershipId: str }] };
  }

  if (mongoose.Types.ObjectId.isValid(str)) {
    return { $or: [{ _id: str }, { membershipId: str }] };
  }

  // Support membershipId like "JBAD203" or string IDs
  if (str) {
    return { membershipId: str };
  }

  return { id: -1 };
};
