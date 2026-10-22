import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && (req.cookies.accessToken || req.cookies.token)) {
      token = req.cookies.accessToken || req.cookies.token;
    }


    if (!token) {
      return next(ApiError.unauthorized('Authentication token is missing. Please log in.'));
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
    jwt.verify(token, env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return next(ApiError.unauthorized('Token has expired. Please log in again.'));
        }
        return next(ApiError.unauthorized('Invalid authentication token.'));
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    next(ApiError.unauthorized('Authentication failed.'));
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated.'));
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Role '${req.user.role}' is not authorized to access this resource.`)
      );
    }

    next();
  };
};
