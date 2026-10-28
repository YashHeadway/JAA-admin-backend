import mongoose from 'mongoose';
import { AdminProfile } from '../models/AdminProfile.js';
import { AdminUser } from '../models/AdminUser.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

export class AdminProfileService {
  /**
   * Automatically ensure every admin user in MongoDB has an AdminProfile.
   * If a profile is missing, creates it with actual admin credentials and empty optional data.
   */
  static async syncExistingAdminProfiles() {
    try {
      const adminUsers = await AdminUser.find({});
      for (const admin of adminUsers) {
        if (!admin.email) continue;
        const normalizedEmail = admin.email.toLowerCase().trim();
        const existingProfile = await AdminProfile.findOne({ email: normalizedEmail });
        if (!existingProfile) {
          const finalName = admin.fullName || admin.name || normalizedEmail.split('@')[0];
          const finalPhone = admin.phone || admin.mobile || '';
          const avatarVal = admin.avatar ?? null;

          let profileId = admin.id;
          if (profileId) {
            const conflict = await AdminProfile.findOne({ id: profileId });
            if (conflict) profileId = undefined;
          }

          await AdminProfile.create({
            id: profileId,
            userId: admin.id,
            name: finalName,
            fullName: finalName,
            email: normalizedEmail,
            phone: finalPhone,
            mobile: finalPhone,
            role: admin.role || 'admin',
            avatar: avatarVal,
            profilePhoto: admin.profilePhoto ?? null,
            isActive: admin.isActive !== undefined ? admin.isActive : true,
            status: admin.status || 'active',
            dateOfBirth: admin.dateOfBirth || '',
            dob: admin.dob || '',
            gender: admin.gender || '',
            address: admin.address || '',
            city: admin.city || '',
            pincode: admin.pincode || '',
          });
        }
      }

      // Also sync any User collection documents with Admin role
      const regularAdmins = await User.find({ role: { $regex: /^admin$/i } });
      for (const u of regularAdmins) {
        if (!u.email) continue;
        const normalizedEmail = u.email.toLowerCase().trim();
        const existingProfile = await AdminProfile.findOne({ email: normalizedEmail });
        if (!existingProfile) {
          const finalName = u.name || u.fullName || normalizedEmail.split('@')[0];
          const finalPhone = u.phone || u.mobile || '';

          let profileId = u.id;
          if (profileId) {
            const conflict = await AdminProfile.findOne({ id: profileId });
            if (conflict) profileId = undefined;
          }

          await AdminProfile.create({
            id: profileId,
            userId: u.id,
            name: finalName,
            fullName: finalName,
            email: normalizedEmail,
            phone: finalPhone,
            mobile: finalPhone,
            role: u.role || 'admin',
            avatar: u.avatar ?? null,
            profilePhoto: u.profilePhoto ?? null,
            isActive: u.isActive !== undefined ? u.isActive : true,
            status: u.status || 'active',
            dateOfBirth: u.dateOfBirth || u.dob || '',
            dob: u.dob || u.dateOfBirth || '',
            gender: u.gender || '',
            address: u.address || '',
            city: u.city || '',
            pincode: u.pincode || '',
          });
        }
      }
    } catch (err) {
      console.warn(`[SYNC ADMIN PROFILES] Non-blocking sync warning: ${err.message}`);
    }
  }

  /**
   * Helper to format an admin profile response with 100% dynamic data from the database:
   * name, email, role, dateOfBirth, dob, gender, mobile, phone,
   * address, city, pincode, profilePhoto, avatar, isActive, status,
   * resetPasswordToken, resetPasswordExpires, createdAt, updatedAt
   */
  static formatProfile(admin, profileDoc = null) {
    if (!admin && !profileDoc) return null;

    // Retrieve raw MongoDB ObjectId string safely before any toObject transform
    let rawObjectId = null;
    if (admin) {
      rawObjectId = admin._id || (admin._doc && admin._doc._id);
    }
    if (!rawObjectId && profileDoc) {
      rawObjectId = profileDoc._id || (profileDoc._doc && profileDoc._doc._id);
    }
    const _id = rawObjectId ? rawObjectId.toString() : '';

    const id = admin?.id ?? profileDoc?.id ?? admin?.userId ?? profileDoc?.userId ?? null;

    const name =
      (admin && (admin.name || admin.fullName)) ||
      (profileDoc && (profileDoc.name || profileDoc.fullName)) ||
      (admin && admin.email ? admin.email.split('@')[0] : '') ||
      (profileDoc && profileDoc.email ? profileDoc.email.split('@')[0] : '');

    const fullName =
      (admin && (admin.fullName || admin.name)) ||
      (profileDoc && (profileDoc.fullName || profileDoc.name)) ||
      name;

    const email = (admin && admin.email) || (profileDoc && profileDoc.email) || '';

    const rawRole = (admin && admin.role) || (profileDoc && profileDoc.role) || '';
    const role = rawRole ? rawRole.toLowerCase() : '';

    const dateOfBirth =
      (admin && (admin.dateOfBirth || admin.dob)) ||
      (profileDoc && (profileDoc.dateOfBirth || profileDoc.dob)) ||
      '';
    const dob =
      (admin && (admin.dob || admin.dateOfBirth)) ||
      (profileDoc && (profileDoc.dob || profileDoc.dateOfBirth)) ||
      dateOfBirth;

    const gender = (admin && admin.gender) || (profileDoc && profileDoc.gender) || '';

    const mobile =
      (admin && (admin.mobile || admin.phone)) ||
      (profileDoc && (profileDoc.mobile || profileDoc.phone)) ||
      '';
    const phone =
      (admin && (admin.phone || admin.mobile)) ||
      (profileDoc && (profileDoc.phone || profileDoc.mobile)) ||
      mobile;

    const address = (admin && admin.address) || (profileDoc && profileDoc.address) || '';
    const city = (admin && admin.city) || (profileDoc && profileDoc.city) || '';
    const pincode = (admin && admin.pincode) || (profileDoc && profileDoc.pincode) || '';

    const profilePhoto =
      (admin && admin.profilePhoto !== undefined ? admin.profilePhoto : null) ??
      (profileDoc && profileDoc.profilePhoto !== undefined ? profileDoc.profilePhoto : null) ??
      (admin && admin.avatar !== undefined ? admin.avatar : null) ??
      (profileDoc && profileDoc.avatar !== undefined ? profileDoc.avatar : null) ??
      null;

    const avatar =
      (admin && admin.avatar !== undefined ? admin.avatar : null) ??
      (profileDoc && profileDoc.avatar !== undefined ? profileDoc.avatar : null) ??
      profilePhoto;

    const isActive =
      admin && admin.isActive !== undefined
        ? Boolean(admin.isActive)
        : profileDoc && profileDoc.isActive !== undefined
          ? Boolean(profileDoc.isActive)
          : true;

    const status =
      (admin && admin.status) ||
      (profileDoc && profileDoc.status) ||
      (isActive ? 'active' : 'inactive');

    const resetPasswordToken =
      (admin && admin.resetPasswordToken) ||
      (profileDoc && profileDoc.resetPasswordToken) ||
      null;
    const resetPasswordExpires =
      (admin && admin.resetPasswordExpires) ||
      (profileDoc && profileDoc.resetPasswordExpires) ||
      null;

    const createdAt = (admin && admin.createdAt) || (profileDoc && profileDoc.createdAt) || null;
    const updatedAt = (admin && admin.updatedAt) || (profileDoc && profileDoc.updatedAt) || null;

    return {
      _id,
      id,
      name,
      fullName,
      email,
      role,
      dateOfBirth,
      dob,
      gender,
      mobile,
      phone,
      address,
      city,
      pincode,
      profilePhoto,
      avatar,
      isActive,
      status,
      resetPasswordToken,
      resetPasswordExpires,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Find verified admin record in MongoDB using authenticated user claims.
   */
  static async findAuthenticatedAdmin(authUser) {
    if (!authUser || (authUser.id === undefined && authUser._id === undefined && !authUser.email)) {
      throw ApiError.unauthorized('Authentication required');
    }

    let admin = null;

    // 1. Try finding by verified unique email first
    if (authUser.email && typeof authUser.email === 'string') {
      const normalizedEmail = authUser.email.trim().toLowerCase();
      admin = await AdminUser.findOne({ email: normalizedEmail }).select('-password -__v');
      if (!admin) {
        admin = await User.findOne({ email: normalizedEmail }).select('-password -__v');
      }
    }

    // 2. If not found by email, search by user ID or ObjectId
    if (!admin) {
      const conditions = [];
      const rawId = authUser.id !== undefined ? authUser.id : authUser._id;
      if (rawId !== undefined && rawId !== null && !isNaN(Number(rawId))) {
        conditions.push({ id: Number(rawId) });
      }
      if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
        conditions.push({ _id: rawId });
      }

      if (conditions.length > 0) {
        const query = conditions.length > 1 ? { $or: conditions } : conditions[0];
        admin = await AdminUser.findOne(query).select('-password -__v');
        if (!admin) {
          admin = await User.findOne(query).select('-password -__v');
        }
      }
    }

    if (!admin) {
      throw ApiError.notFound('Admin profile not found');
    }

    // Role check: Only Admin or Super Admin permitted
    const role = (admin.role || '').trim().toLowerCase();
    if (role !== 'admin' && role !== 'super admin') {
      throw ApiError.forbidden('Access denied');
    }

    // Account status check: Reject disabled or inactive accounts
    const isActiveVal = admin.get ? admin.get('isActive') : admin.isActive ?? admin._doc?.isActive;
    const statusVal = admin.get ? admin.get('status') : admin.status ?? admin._doc?.status;
    if (isActiveVal === false || statusVal === 'inactive' || statusVal === 'disabled') {
      throw ApiError.forbidden('Access denied');
    }

    return admin;
  }

  /**
   * Retrieve all admin profiles in the database.
   */
  static async getAllProfiles() {
    await this.syncExistingAdminProfiles();

    // Query all admin users sorted by ID
    const adminUsers = await AdminUser.find({}).sort({ id: 1, createdAt: 1 }).select('-password -__v');
    const allProfiles = await AdminProfile.find({}).select('-password -__v');

    const profileMap = new Map();
    for (const p of allProfiles) {
      if (p.email) profileMap.set(p.email.toLowerCase().trim(), p);
      if (p.id) profileMap.set(`id_${p.id}`, p);
      if (p.userId) profileMap.set(`user_${p.userId}`, p);
    }

    const seenEmails = new Set();
    const result = [];

    for (const admin of adminUsers) {
      const emailKey = admin.email ? admin.email.toLowerCase().trim() : '';
      if (emailKey && seenEmails.has(emailKey)) continue;
      if (emailKey) seenEmails.add(emailKey);

      const pDoc = profileMap.get(emailKey) || profileMap.get(`id_${admin.id}`) || null;
      result.push(this.formatProfile(admin, pDoc));
    }

    // Include any profiles in AdminProfile that might not have an AdminUser record
    for (const p of allProfiles) {
      const emailKey = p.email ? p.email.toLowerCase().trim() : '';
      if (emailKey && !seenEmails.has(emailKey)) {
        seenEmails.add(emailKey);
        result.push(this.formatProfile(p, p));
      }
    }

    return result;
  }

  /**
   * Retrieve admin profile.
   * If targetId is provided on the URL (e.g. /api/admin/profile/1 or /api/admin/profile/6ad9dbae...),
   * fetches the profile for that targetId.
   * If not found, throws 404 Not Found.
   * Otherwise, fetches the currently authenticated admin's profile.
   */
  static async getProfile(authUser, targetId = null) {
    // 1. If targetId was specified on URL (e.g. /profile/1 or /profile/6ad9dbae...)
    if (targetId !== null && targetId !== undefined && targetId !== '') {
      const numId = Number(targetId);
      const targetConditions = [];
      if (!isNaN(numId)) {
        targetConditions.push({ id: numId }, { userId: numId });
      }
      if (mongoose.Types.ObjectId.isValid(targetId)) {
        targetConditions.push({ _id: targetId });
      }

      let admin = null;
      let profileDoc = null;

      if (targetConditions.length > 0) {
        admin = await AdminUser.findOne({ $or: targetConditions }).select('-password -__v');
        if (!admin) {
          admin = await User.findOne({ $or: targetConditions }).select('-password -__v');
        }
        profileDoc = await AdminProfile.findOne({ $or: targetConditions }).select('-password -__v');
      }

      // If not found in database, reject with 404 Not Found
      if (!admin && !profileDoc) {
        throw ApiError.notFound('Admin profile not found');
      }

      return this.formatProfile(admin || profileDoc, profileDoc);
    }

    // 2. Default: Fetch authenticated admin profile
    const admin = await this.findAuthenticatedAdmin(authUser);

    let profileDoc = null;
    try {
      if (admin.email) {
        profileDoc = await AdminProfile.findOne({ email: admin.email.toLowerCase().trim() }).select('-password -__v');
      }
      if (!profileDoc && admin.id !== undefined && !isNaN(Number(admin.id))) {
        profileDoc = await AdminProfile.findOne({
          $or: [{ userId: Number(admin.id) }, { id: Number(admin.id) }],
        }).select('-password -__v');
      }
    } catch {
      // Non-blocking lookup
    }

    // If profileDoc doesn't exist yet, auto-create it
    if (!profileDoc && admin.email) {
      try {
        const finalName = admin.fullName || admin.name || admin.email.split('@')[0];
        const finalPhone = admin.phone || admin.mobile || '';
        profileDoc = await AdminProfile.create({
          id: admin.id,
          userId: admin.id,
          name: finalName,
          fullName: finalName,
          email: admin.email.toLowerCase().trim(),
          phone: finalPhone,
          mobile: finalPhone,
          role: admin.role || 'admin',
          avatar: admin.avatar ?? null,
          profilePhoto: admin.profilePhoto ?? null,
          isActive: admin.isActive !== undefined ? admin.isActive : true,
          status: admin.status || 'active',
          dateOfBirth: admin.dateOfBirth || '',
          dob: admin.dob || '',
          gender: admin.gender || '',
          address: admin.address || '',
          city: admin.city || '',
          pincode: admin.pincode || '',
        });
      } catch {
        // Non-blocking
      }
    }

    return this.formatProfile(admin, profileDoc);
  }

  /**
   * Update admin profile with new details and sync across collections.
   */
  static async updateProfile(authUser, data, targetId = null) {
    let admin = null;
    if (targetId !== null && targetId !== undefined && targetId !== '') {
      const numId = Number(targetId);
      const conditions = [];
      if (!isNaN(numId)) conditions.push({ id: numId }, { userId: numId });
      if (mongoose.Types.ObjectId.isValid(targetId)) conditions.push({ _id: targetId });
      if (conditions.length > 0) {
        admin = await AdminUser.findOne({ $or: conditions });
        if (!admin) {
          admin = await User.findOne({ $or: conditions });
        }
      }
    }
    if (!admin) {
      admin = await this.findAuthenticatedAdmin(authUser);
    }

    let profileDoc = null;
    if (admin.email) {
      profileDoc = await AdminProfile.findOne({ email: admin.email.toLowerCase().trim() });
    }
    if (!profileDoc && admin.id !== undefined && !isNaN(Number(admin.id))) {
      profileDoc = await AdminProfile.findOne({
        $or: [{ userId: Number(admin.id) }, { id: Number(admin.id) }],
      });
    }

    if (!profileDoc) {
      const finalName = admin.fullName || admin.name || (admin.email ? admin.email.split('@')[0] : '');
      profileDoc = await AdminProfile.create({
        userId: admin.id,
        id: admin.id,
        name: finalName,
        fullName: finalName,
        email: admin.email,
        phone: admin.phone || admin.mobile || '',
        mobile: admin.phone || admin.mobile || '',
        role: admin.role || 'admin',
        avatar: admin.avatar ?? null,
        profilePhoto: admin.profilePhoto ?? null,
        isActive: admin.isActive !== undefined ? admin.isActive : true,
        status: admin.status || 'active',
        dateOfBirth: admin.dateOfBirth || '',
        dob: admin.dob || '',
        gender: admin.gender || '',
        address: admin.address || '',
        city: admin.city || '',
        pincode: admin.pincode || '',
      });
    }

    // Normalize field aliases
    const fullName = data.fullName ?? data.name;
    const phone = data.phone ?? data.mobile;
    const avatar = data.avatar ?? data.profilePhoto;
    const dateOfBirth = data.dateOfBirth ?? data.dob;
    const newEmail = data.email ? data.email.trim().toLowerCase() : undefined;

    // Email conflict check if changing email
    if (newEmail && newEmail !== profileDoc.email) {
      const emailConflictAdmin = await AdminUser.findOne({
        email: newEmail,
        id: { $ne: admin.id },
      });
      const emailConflictUser = await User.findOne({
        email: newEmail,
        id: { $ne: admin.id },
      });
      if (emailConflictAdmin || emailConflictUser) {
        throw ApiError.conflict('An account with this email address already exists');
      }
      profileDoc.email = newEmail;
      admin.email = newEmail;
    }

    if (fullName !== undefined) {
      profileDoc.fullName = fullName.trim();
      profileDoc.name = fullName.trim();
      admin.fullName = fullName.trim();
      admin.name = fullName.trim();
    }
    if (phone !== undefined) {
      profileDoc.phone = phone.trim();
      profileDoc.mobile = phone.trim();
      admin.phone = phone.trim();
      admin.mobile = phone.trim();
    }
    if (dateOfBirth !== undefined) {
      profileDoc.dateOfBirth = dateOfBirth.trim();
      profileDoc.dob = dateOfBirth.trim();
      admin.dateOfBirth = dateOfBirth.trim();
      admin.dob = dateOfBirth.trim();
    }
    if (data.gender !== undefined) {
      profileDoc.gender = data.gender;
      admin.gender = data.gender;
    }
    if (data.address !== undefined) {
      profileDoc.address = data.address.trim();
      admin.address = data.address.trim();
    }
    if (data.city !== undefined) {
      profileDoc.city = data.city.trim();
      admin.city = data.city.trim();
    }
    if (data.pincode !== undefined) {
      profileDoc.pincode = data.pincode.trim();
      admin.pincode = data.pincode.trim();
    }
    if (avatar !== undefined) {
      profileDoc.avatar = avatar;
      profileDoc.profilePhoto = avatar;
      admin.avatar = avatar;
      admin.profilePhoto = avatar;
    }
    if (data.isActive !== undefined) {
      profileDoc.isActive = Boolean(data.isActive);
      admin.isActive = Boolean(data.isActive);
    }
    if (data.status !== undefined) {
      profileDoc.status = data.status;
      admin.status = data.status;
    }

    await profileDoc.save();
    await admin.save();

    return this.formatProfile(admin, profileDoc);
  }
}
