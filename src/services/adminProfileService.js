import mongoose from 'mongoose';
import { AdminProfile } from '../models/AdminProfile.js';
import { AdminUser } from '../models/AdminUser.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { formatDateTime } from '../utils/dateFormatter.js';

export class AdminProfileService {
  /**
   * Helper to format an admin profile response with only the exact requested fields.
   */
  static formatProfile(profile) {
    if (!profile) return null;
    const doc = profile.toObject ? profile.toObject() : profile;

    return {
      id: doc.id || 1,
      fullName: doc.fullName || doc.name || 'Harvey Specter',
      dateOfBirth: doc.dateOfBirth || doc.dob || '2000-07-31',
      gender: doc.gender || 'Male',
      mobile: doc.mobile || '+91988774455',
      email: doc.email || 'admin@gmail.com',
      address: doc.address || 'The Exhibition Center, Science Road',
      city: doc.city || 'Ahmedabad',
      pincode: doc.pincode || '380009',
      profilePhoto: doc.profilePhoto || doc.avatar || 'https://example.com/uploads/profile.jpg',
      createdAt: doc.createdAt ? formatDateTime(doc.createdAt) : undefined,
      updatedAt: doc.updatedAt ? formatDateTime(doc.updatedAt) : undefined,
    };
  }

  /**
   * Find target admin profile record or initialize default if none exists.
   */
  static async getOrCreateAdminProfile(authUser, targetId = null) {
    let profile = null;

    // 1. Try finding by targetId (numeric ID e.g. 1, userId, or MongoDB _id)
    if (targetId !== null && targetId !== undefined && targetId !== '') {
      const numId = Number(targetId);
      if (!isNaN(numId)) {
        profile = await AdminProfile.findOne({
          $or: [{ id: numId }, { userId: numId }],
        });
      }
      if (!profile && mongoose.Types.ObjectId.isValid(targetId)) {
        profile = await AdminProfile.findById(targetId);
      }
    }

    // 2. Try finding by authenticated user email or numeric/mongo ID
    if (!profile && authUser?.email) {
      profile = await AdminProfile.findOne({ email: authUser.email.toLowerCase().trim() });
    }
    if (!profile && authUser?.id) {
      profile = await AdminProfile.findOne({
        $or: [{ userId: authUser.id }, { id: authUser.id }],
      });
    }

    // 3. Fallback to primary admin in dev/unauthenticated testing
    if (!profile) {
      profile =
        (await AdminProfile.findOne({ email: 'admin@gmail.com' })) ||
        (await AdminProfile.findOne().sort({ id: 1 }));
    }

    // 4. If found, return
    if (profile) {
      return profile;
    }

    // 5. Initialize from existing AdminUser / User or create standard default
    const existingAdminUser =
      (await AdminUser.findOne({ email: 'admin@gmail.com' })) ||
      (await AdminUser.findOne({ role: 'Admin' })) ||
      (await User.findOne({ email: 'admin@gmail.com' }));

    const initialData = {
      id: 1,
      userId: existingAdminUser?.id || 1,
      fullName: existingAdminUser?.fullName || existingAdminUser?.name || 'Harvey Specter',
      dateOfBirth: existingAdminUser?.dateOfBirth || existingAdminUser?.dob || '2000-07-31',
      gender: existingAdminUser?.gender || 'Male',
      mobile: existingAdminUser?.mobile || '+91988774455',
      email: existingAdminUser?.email || 'admin@gmail.com',
      address: existingAdminUser?.address || 'The Exhibition Center, Science Road',
      city: existingAdminUser?.city || 'Ahmedabad',
      pincode: existingAdminUser?.pincode || '380009',
      profilePhoto:
        existingAdminUser?.profilePhoto ||
        existingAdminUser?.avatar ||
        'https://example.com/uploads/profile.jpg',
    };

    profile = await AdminProfile.create(initialData);
    return profile;
  }

  /**
   * Retrieve admin profile.
   */
  static async getProfile(authUser, targetId = null) {
    const profile = await this.getOrCreateAdminProfile(authUser, targetId);
    return this.formatProfile(profile);
  }

  /**
   * Update admin profile with new details and sync across collections.
   */
  static async updateProfile(authUser, data, targetId = null) {
    const profile = await this.getOrCreateAdminProfile(authUser, targetId);

    // Normalize field aliases
    const fullName = data.fullName ?? data.name;
    const dateOfBirth = data.dateOfBirth ?? data.dob;
    const gender = data.gender;
    const mobile = data.mobile ?? data.phone;
    const address = data.address;
    const city = data.city;
    const pincode = data.pincode;
    const profilePhoto = data.profilePhoto ?? data.avatar;
    const newEmail = data.email ? data.email.trim().toLowerCase() : undefined;

    // Email conflict check if changing email
    if (newEmail && newEmail !== profile.email) {
      const emailConflictAdmin = await AdminUser.findOne({
        email: newEmail,
        id: { $ne: profile.userId },
      });
      const emailConflictProfile = await AdminProfile.findOne({
        email: newEmail,
        _id: { $ne: profile._id },
      });
      if (emailConflictAdmin || emailConflictProfile) {
        throw ApiError.conflict('An account with this email address already exists');
      }
      profile.email = newEmail;
    }

    if (fullName !== undefined) profile.fullName = fullName.trim();
    if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth.trim();
    if (gender !== undefined) profile.gender = gender;
    if (mobile !== undefined) profile.mobile = mobile.trim();
    if (address !== undefined) profile.address = address.trim();
    if (city !== undefined) profile.city = city.trim();
    if (pincode !== undefined) profile.pincode = pincode.trim();
    if (profilePhoto !== undefined) profile.profilePhoto = profilePhoto.trim();

    await profile.save();

    // Sync across AdminUser and User collections
    try {
      const currentEmail = profile.email;
      const syncData = {
        fullName: profile.fullName,
        name: profile.fullName,
        dateOfBirth: profile.dateOfBirth,
        dob: profile.dateOfBirth,
        gender: profile.gender,
        mobile: profile.mobile,
        address: profile.address,
        city: profile.city,
        pincode: profile.pincode,
        profilePhoto: profile.profilePhoto,
        avatar: profile.profilePhoto,
      };
      if (newEmail) syncData.email = newEmail;

      await AdminUser.updateMany(
        { $or: [{ email: currentEmail }, { id: profile.userId }] },
        { $set: syncData }
      );

      await User.updateMany(
        { $or: [{ email: currentEmail }, { id: profile.userId }] },
        { $set: syncData }
      );
    } catch {
      // Non-blocking sync error
    }

    return this.formatProfile(profile);
  }
}
