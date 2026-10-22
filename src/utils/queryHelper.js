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
  const num = Number(id);
  if (!isNaN(num) && num > 0) {
    return { id: num };
  }
  if (id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }
  return { id: -1 }; // will match nothing safely without throwing CastError
};
