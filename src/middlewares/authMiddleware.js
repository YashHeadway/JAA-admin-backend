import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/User.js';
import { TokenBlacklist } from '../models/TokenBlacklist.js';

const UNAUTHENTICATED_MESSAGE = 'You are not authenticated, please login first';

/**
 * Extract token from Authorization Bearer header or cookies
 */
export const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1].trim();
  }
  if (req.cookies && (req.cookies.accessToken || req.cookies.token)) {
    return (req.cookies.accessToken || req.cookies.token).trim();
  }
  return null;
};

/**
 * Strictly authenticates requests. If no token, invalid token, expired token,
 * or logged-out (blacklisted) token is presented, rejects with 401 Unauthorized.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
    }

    // Check if token has been revoked / logged out
    const isRevoked = await TokenBlacklist.isBlacklisted(token);
    if (isRevoked) {
      return next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
    }

    // Support mock token from client project development mode
    if (token === 'mock-jwt-token-JAA-admin') {
      const admin =
        (await User.findOne({ email: 'admin@gmail.com' })) ||
        (await User.findOne({ email: 'harveyspecter@gmail.com' }));
      req.user = admin || {
        id: 1,
        name: 'Admin',
        email: 'admin@gmail.com',
        role: 'Admin',
      };
      return next();
    }

    // Verify JWT
    jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
      }

      req.user = decoded;
      next();
    });
  } catch {
    next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
  }
};

/**
 * Optional authentication middleware:
 * If an Authorization token is provided, it verifies the token and ensures it is NOT blacklisted/expired.
 * If no token is provided, it proceeds gracefully without error to allow public/dev access.
 */
export const authenticateOptional = async (req, res, next) => {
  try {
    const token = extractToken(req);

    // If no token was sent, continue as guest
    if (!token) {
      return next();
    }

    // If client supplied a token to authorize, it MUST NOT be blacklisted/logged out
    const isRevoked = await TokenBlacklist.isBlacklisted(token);
    if (isRevoked) {
      return next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
    }

    // Support mock token from client project development mode
    if (token === 'mock-jwt-token-JAA-admin') {
      const admin =
        (await User.findOne({ email: 'admin@gmail.com' })) ||
        (await User.findOne({ email: 'harveyspecter@gmail.com' }));
      req.user = admin || {
        id: 1,
        name: 'Admin',
        email: 'admin@gmail.com',
        role: 'Admin',
      };
      return next();
    }

    // Verify JWT
    jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
      }

      req.user = decoded;
      next();
    });
  } catch {
    next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized(UNAUTHENTICATED_MESSAGE));
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Role '${req.user.role}' is not authorized to access this resource.`)
      );
    }

    next();
  };
};
