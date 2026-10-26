import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// In-memory cache for ultra-fast O(1) synchronous lookups
const blacklistMemoryCache = new Set();

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Number,
      default: null,
    },
    email: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // MongoDB TTL index: automatically deletes document when expiresAt timestamp arrives
    },
  },
  {
    timestamps: true,
    collection: 'token_blacklists',
  }
);

/**
 * Add a token to the blacklist (both in memory and MongoDB).
 */
tokenBlacklistSchema.statics.blacklistToken = async function (token, user = null) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  // Immediately store in in-memory cache
  blacklistMemoryCache.add(cleanToken);

  let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h fallback
  try {
    const decoded = jwt.decode(cleanToken);
    if (decoded && decoded.exp) {
      expiresAt = new Date(decoded.exp * 1000);
    }
  } catch {
    // fallback 24h
  }

  try {
    return await this.findOneAndUpdate(
      { token: cleanToken },
      {
        token: cleanToken,
        userId: user?.id || null,
        email: user?.email || '',
        expiresAt,
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch {
    return null;
  }
};

/**
 * Check if a token is in the blacklist.
 */
tokenBlacklistSchema.statics.isBlacklisted = async function (token) {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim();
  if (!cleanToken) return false;

  // Ultra-fast in-memory check
  if (blacklistMemoryCache.has(cleanToken)) {
    return true;
  }

  // Database check with cache warm-up
  try {
    const count = await this.countDocuments({ token: cleanToken });
    if (count > 0) {
      blacklistMemoryCache.add(cleanToken);
      return true;
    }
  } catch {
    // on DB error fall back to memory cache
  }

  return false;
};

export const TokenBlacklist =
  mongoose.models.TokenBlacklist || mongoose.model('TokenBlacklist', tokenBlacklistSchema);

// Warm up in-memory cache with active unexpired blacklisted tokens on startup
TokenBlacklist.find({ expiresAt: { $gt: new Date() } })
  .select('token')
  .lean()
  .then((records) => {
    if (Array.isArray(records)) {
      records.forEach((r) => {
        if (r.token) blacklistMemoryCache.add(r.token);
      });
    }
  })
  .catch(() => {});
