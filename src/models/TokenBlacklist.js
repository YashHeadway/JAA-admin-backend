import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// In-memory cache for ultra-fast O(1) synchronous lookups
const blacklistMemoryCache = new Set();

// In-memory map: userId or email -> timestamp (in seconds) of their latest logout
const userLogoutTimestamps = new Map();

/**
 * Standardize token string by stripping Bearer, token= prefixes, quotes, and whitespace
 */
export const sanitizeToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  let clean = token.trim().replace(/^["']|["']$/g, '');
  if (clean.toLowerCase().startsWith('bearer ')) {
    clean = clean.substring(7).trim();
  }
  if (clean.toLowerCase().startsWith('token=')) {
    clean = clean.substring(6).trim();
  }
  return clean;
};

export const recordUserLogout = (userId, email = '') => {
  const nowSec = Math.floor(Date.now() / 1000);
  if (userId !== undefined && userId !== null) {
    userLogoutTimestamps.set(String(userId), nowSec);
  }
  if (email && typeof email === 'string') {
    userLogoutTimestamps.set(email.trim().toLowerCase(), nowSec);
  }
};

export const isUserLoggedOut = (userId, email, iat) => {
  if (!iat) return false;
  if (userId !== undefined && userId !== null) {
    const logoutTime = userLogoutTimestamps.get(String(userId));
    if (logoutTime && iat <= logoutTime) {
      return true;
    }
  }
  if (email && typeof email === 'string') {
    const logoutTime = userLogoutTimestamps.get(email.trim().toLowerCase());
    if (logoutTime && iat <= logoutTime) {
      return true;
    }
  }
  return false;
};

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
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) return null;

  // Immediately store in in-memory cache
  blacklistMemoryCache.add(cleanToken);

  let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h fallback
  let decodedUser = null;
  try {
    const decoded = jwt.decode(cleanToken);
    if (decoded) {
      decodedUser = decoded;
      if (decoded.exp) {
        expiresAt = new Date(decoded.exp * 1000);
      }
      recordUserLogout(decoded.id, decoded.email);
    }
  } catch {
    // fallback 24h
  }

  if (user) {
    recordUserLogout(user.id || user._id, user.email);
  }

  try {
    if (mongoose.connection?.readyState === 1) {
      return await this.findOneAndUpdate(
        { token: cleanToken },
        {
          token: cleanToken,
          userId: user?.id || decodedUser?.id || null,
          email: user?.email || decodedUser?.email || '',
          expiresAt,
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    return { token: cleanToken };
  } catch {
    return null;
  }
};

/**
 * Check if a token is in the blacklist.
 */
tokenBlacklistSchema.statics.isBlacklisted = async function (token) {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) return false;

  // 1. Ultra-fast in-memory token check
  if (blacklistMemoryCache.has(cleanToken)) {
    return true;
  }

  // 2. Check if token was issued prior to user's latest logout
  try {
    const decoded = jwt.decode(cleanToken);
    if (decoded && decoded.iat) {
      if (isUserLoggedOut(decoded.id, decoded.email, decoded.iat)) {
        blacklistMemoryCache.add(cleanToken);
        return true;
      }
    }
  } catch {}

  // 3. Database check with cache warm-up (only query if DB connection is active)
  try {
    if (mongoose.connection?.readyState === 1) {
      const count = await this.countDocuments({ token: cleanToken });
      if (count > 0) {
        blacklistMemoryCache.add(cleanToken);
        return true;
      }
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
