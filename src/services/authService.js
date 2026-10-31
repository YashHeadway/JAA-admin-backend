import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { AdminUser } from '../models/AdminUser.js';
import { AdminProfile } from '../models/AdminProfile.js';
import { ApiError } from '../utils/apiError.js';
import { getNextSequence } from '../models/Counter.js';
import { emailService } from './emailService.js';

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

    // If user role is Admin, automatically ensure their AdminProfile is created
    const roleLower = (newUser.role || '').trim().toLowerCase();
    if (roleLower === 'admin' || roleLower === 'super admin') {
      try {
        await AdminProfile.findOneAndUpdate(
          { email: normalizedEmail },
          {
            $setOnInsert: {
              id: newUser.id,
              userId: newUser.id,
              name: newUser.name,
              fullName: newUser.name,
              email: normalizedEmail,
              phone: (newUser.mobile || '').trim(),
              mobile: (newUser.mobile || '').trim(),
              role: 'admin',
              image: null,
              avatar: null,
              profilePhoto: null,
              isActive: true,
            },
          },
          { upsert: true, new: true }
        );
      } catch (profErr) {
        logger.warn(`Failed to auto-create AdminProfile for ${normalizedEmail}: ${profErr.message}`);
      }
    }

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
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await AdminUser.findOne({ email: normalizedEmail });
    }

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
  static async adminRegister(adminData) {
    const { email, password, name, fullName, phone, mobile } = adminData || {};
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
    const finalName = (name || fullName || '').trim() || (defaultName.toLowerCase() === 'admin' ? 'Admin' : defaultName || 'Admin');
    const finalPhone = (phone || mobile || '').trim();

    // Stores credentials in admin-users
    const newAdmin = await AdminUser.create({
      id,
      name: finalName,
      fullName: finalName,
      email: normalizedEmail,
      password,
      role: 'admin',
      mobile: finalPhone,
      phone: finalPhone,
      image: null,
      avatar: null,
      profilePhoto: null,
      isActive: true,
      status: 'active',
    });

    // Automatically create corresponding AdminProfile with admin credentials & empty other data
    try {
      await AdminProfile.findOneAndUpdate(
        { email: normalizedEmail },
        {
          $setOnInsert: {
            id: newAdmin.id,
            userId: newAdmin.id,
            name: finalName,
            fullName: finalName,
            email: normalizedEmail,
            phone: finalPhone,
            mobile: finalPhone,
            role: 'admin',
            image: null,
            avatar: null,
            profilePhoto: null,
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );
    } catch (profErr) {
      logger.warn(`Failed to auto-create AdminProfile for ${normalizedEmail}: ${profErr.message}`);
    }

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
    let admin = await AdminUser.findOne({ email: normalizedEmail });
    if (!admin) {
      admin = await User.findOne({ email: normalizedEmail });
    }

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

  /**
   * Request password reset token for given email.
   */
  static async forgotPassword(email) {
    if (!email) {
      throw ApiError.badRequest('Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check AdminUser collection first, then User collection
    let account = await AdminUser.findOne({ email: normalizedEmail });
    if (!account) {
      account = await User.findOne({ email: normalizedEmail });
    }

    let resetToken = null;

    if (account) {
      resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      account.resetPasswordToken = resetToken;
      account.resetPasswordExpires = resetExpires;
      await account.save({ validateBeforeSave: false });

      logger.info(`[FORGOT PASSWORD] Reset token generated for ${normalizedEmail}: ${resetToken}`);
      console.log(`\n======================================================`);
      console.log(`[PASSWORD RESET TOKEN] Generated for: ${normalizedEmail}`);
      console.log(`Token: ${resetToken}`);
      console.log(`Expires: ${resetExpires.toISOString()}`);
      console.log(`======================================================\n`);

      // Dispatch password reset email via Nodemailer SMTP service
      await emailService.sendPasswordResetEmail({
        to: account.email,
        name: account.name || 'User',
        resetToken,
      });
    } else {
      logger.info(`[FORGOT PASSWORD] Request for non-existent email: ${normalizedEmail}`);
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
      resetToken,
    };
  }

  /**
   * Reset password using token, newPassword and confirmPassword.
   */
  static async resetPassword({ token, newPassword, confirmPassword, email }) {
    if (!newPassword || !confirmPassword || newPassword !== confirmPassword) {
      throw ApiError.badRequest('New password and confirm password do not match.');
    }

    if (!token) {
      throw ApiError.badRequest('Invalid or expired password reset token.');
    }

    const now = new Date();
    const query = {
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: now },
    };

    let account = null;
    if (email) {
      const emailQuery = { ...query, email: email.trim().toLowerCase() };
      account = await AdminUser.findOne(emailQuery);
      if (!account) {
        account = await User.findOne(emailQuery);
      }
    }

    if (!account) {
      account = await AdminUser.findOne(query);
      if (!account) {
        account = await User.findOne(query);
      }
    }

    if (!account) {
      throw ApiError.badRequest('Invalid or expired password reset token.');
    }

    // Update password (pre-save hook will hash it with bcrypt)
    account.password = newPassword;
    account.resetPasswordToken = null;
    account.resetPasswordExpires = null;
    await account.save();

    // If an account with the same email exists in the other collection, sync the password
    try {
      if (account.constructor.modelName === 'AdminUser') {
        const regularUser = await User.findOne({ email: account.email });
        if (regularUser) {
          regularUser.password = newPassword;
          regularUser.resetPasswordToken = null;
          regularUser.resetPasswordExpires = null;
          await regularUser.save();
        }
      } else {
        const adminUser = await AdminUser.findOne({ email: account.email });
        if (adminUser) {
          adminUser.password = newPassword;
          adminUser.resetPasswordToken = null;
          adminUser.resetPasswordExpires = null;
          await adminUser.save();
        }
      }
    } catch (syncErr) {
      logger.warn(`[PASSWORD RESET] Non-blocking sync warning: ${syncErr.message}`);
    }

    logger.info(`[PASSWORD RESET] Successfully updated password for ${account.email}`);

    return {
      success: true,
      message: 'Password reset successfully.',
    };
  }

  /**
   * Change user password given currentPassword, newPassword, and confirmNewPassword.
   */
  static async changePassword({ userId, email, currentPassword, newPassword, confirmNewPassword }) {
    if (!newPassword || !confirmNewPassword || newPassword !== confirmNewPassword) {
      throw ApiError.badRequest('New password and confirm password do not match.');
    }

    if (!currentPassword) {
      throw ApiError.badRequest('Current password is incorrect.');
    }

    let account = null;

    // 1. Try finding by email (uniquely identifies account across collections)
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      account = await AdminUser.findOne({ email: normalizedEmail });
      if (!account) {
        account = await User.findOne({ email: normalizedEmail });
      }
    }

    // 2. Try finding by userId (if authenticated and email was not matched)
    if (!account && userId !== undefined && userId !== null) {
      const conditions = [];
      if (!isNaN(Number(userId))) {
        conditions.push({ id: Number(userId) });
      }
      if (mongoose.Types.ObjectId.isValid(userId)) {
        conditions.push({ _id: userId });
      }
      if (conditions.length > 0) {
        const query = conditions.length > 1 ? { $or: conditions } : conditions[0];
        account = await AdminUser.findOne(query);
        if (!account) {
          account = await User.findOne(query);
        }
      }
    }

    // 3. Fallback: If neither userId nor email was specified, locate the account whose current password matches
    if (!account) {
      const allAdmins = await AdminUser.find({});
      for (const admin of allAdmins) {
        if (await admin.comparePassword(currentPassword)) {
          account = admin;
          break;
        }
      }

      if (!account) {
        const allUsers = await User.find({});
        for (const u of allUsers) {
          if (await u.comparePassword(currentPassword)) {
            account = u;
            break;
          }
        }
      }
    }

    if (!account) {
      throw ApiError.badRequest('Current password is incorrect.');
    }

    // Verify current password for the identified account
    const isCurrentValid = await account.comparePassword(currentPassword);
    if (!isCurrentValid) {
      throw ApiError.badRequest('Current password is incorrect.');
    }

    // Update password (pre-save hook will hash it with bcrypt)
    account.password = newPassword;
    account.resetPasswordToken = null;
    account.resetPasswordExpires = null;
    await account.save();

    // If an account with the same email exists in the other collection, sync the password
    try {
      if (account.constructor.modelName === 'AdminUser') {
        const regularUser = await User.findOne({ email: account.email });
        if (regularUser) {
          regularUser.password = newPassword;
          regularUser.resetPasswordToken = null;
          regularUser.resetPasswordExpires = null;
          await regularUser.save();
        }
      } else {
        const adminUser = await AdminUser.findOne({ email: account.email });
        if (adminUser) {
          adminUser.password = newPassword;
          adminUser.resetPasswordToken = null;
          adminUser.resetPasswordExpires = null;
          await adminUser.save();
        }
      }
    } catch (syncErr) {
      logger.warn(`[CHANGE PASSWORD] Non-blocking sync warning: ${syncErr.message}`);
    }

    logger.info(`[CHANGE PASSWORD] Successfully changed password for ${account.email}`);

    return {
      success: true,
      message: 'Password changed successfully.',
    };
  }
}





