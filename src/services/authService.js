import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AdminUser } from '../models/AdminUser.js';
import { ApiError } from '../utils/apiError.js';
import { getNextSequence } from '../models/Counter.js';


export class AuthService {
  /**
   * Generate both access and refresh JWT authentication tokens for a user.
   */
  static generateTokens(user) {
    const payload = {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const refreshPayload = {
      id: user.id || user._id,
      email: user.email,
    };

    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
      token: accessToken, // backward compatibility
    };
  }

  /**
   * Generate legacy single token (backwards compatibility).
   */
  static generateToken(user) {
    return this.generateTokens(user).accessToken;
  }

  /**
   * Register a new user account.
   */
  static async register(userData) {
    const { email, password, name, role, mobile, dob, gender, address, city, pincode, avatar } = userData;

    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Auto-derive human-readable name if not provided
    const defaultName = normalizedEmail
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const finalName = name?.trim() || defaultName || 'User';

    // Get sequential numeric ID
    let id;
    try {
      id = await getNextSequence('users');
    } catch {
      const maxUser = await User.findOne().sort({ id: -1 });
      id = maxUser && maxUser.id ? maxUser.id + 1 : 1;
    }

    // Create user (User model pre-save hook handles bcrypt password hashing)
    const newUser = await User.create({
      id,
      name: finalName,
      email: normalizedEmail,
      password,
      role: role || 'Admin',
      mobile: mobile || '',
      dob: dob || '',
      gender: gender || 'Male',
      address: address || '',
      city: city || '',
      pincode: pincode || '',
      avatar: avatar || '',
    });

    const tokens = this.generateTokens(newUser);
    const userObj = newUser.toObject();

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.token,
      user: userObj,
    };
  }

  /**
   * Authenticate user credentials and return access and refresh JWT tokens.
   */
  static async login({ email, password }) {
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Verify password via comparePassword helper (supports bcrypt and fallback)
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = this.generateTokens(user);
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    delete userObj.__v;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.token,
      user: userObj,
    };
  }

  /**
   * Validate a refresh token and issue a fresh pair of tokens.
   */
  static async refreshTokens(providedRefreshToken) {
    if (!providedRefreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }

    try {
      const decoded = jwt.verify(providedRefreshToken, env.JWT_REFRESH_SECRET);
      const user = await this.getCurrentUser(decoded.id);
      const tokens = this.generateTokens(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        token: tokens.token,
        user,
      };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Refresh token has expired. Please log in again.');
      }
      throw ApiError.unauthorized('Invalid refresh token.');
    }
  }

  /**
   * Retrieve current user profile by user ID or MongoDB _id.
   */
  static async getCurrentUser(userId) {
    const conditions = [];
    if (!isNaN(Number(userId))) {
      conditions.push({ id: Number(userId) });
    }
    if (mongoose.Types.ObjectId.isValid(userId)) {
      conditions.push({ _id: userId });
    }

    const query = conditions.length > 1 ? { $or: conditions } : conditions[0] || { id: userId };

    // Search AdminUser table first, then User table
    let user = await AdminUser.findOne(query).select('-password -__v');
    if (!user) {
      user = await User.findOne(query).select('-password -__v');
    }

    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  /**
   * Register a new admin account in admin-users table with only email and password.
   */
  static async adminRegister({ email, password }) {
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingAdmin = await AdminUser.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      throw ApiError.conflict('An admin account with this email already exists');
    }

    let id;
    try {
      id = await getNextSequence('admin-users');
    } catch {
      const maxAdmin = await AdminUser.findOne().sort({ id: -1 });
      id = maxAdmin && maxAdmin.id ? maxAdmin.id + 1 : 1;
    }

    const defaultName = normalizedEmail
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const finalName = defaultName.toLowerCase() === 'admin' ? 'Admin' : defaultName || 'Admin';

    // Stores data provided in the API + sequential id and role
    const newAdmin = await AdminUser.create({
      id,
      name: finalName,
      email: normalizedEmail,
      password,
      role: 'Admin',
    });


    const tokens = this.generateTokens(newAdmin);
    const adminObj = newAdmin.toObject();

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.token,
      user: adminObj,
    };
  }

  /**
   * Authenticate admin from admin-users table and return access and refresh JWT tokens.
   */
  static async adminLogin({ email, password }) {
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = await AdminUser.findOne({ email: normalizedEmail });

    if (!admin) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = this.generateTokens(admin);
    const adminObj = admin.toObject ? admin.toObject() : { ...admin };
    delete adminObj.password;
    delete adminObj.__v;
    if (!adminObj.name) {
      adminObj.name = 'Admin';
    }


    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.token,
      user: adminObj,
    };
  }
}




