import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Member } from '../models/Member.js';
import { User } from '../models/User.js';
import { CommitteeService } from './committeeService.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';
import { MEMBER_STATUS } from '../constants/status.js';
import { formatDateOnly } from '../utils/dateFormatter.js';
import { AuthService } from './authService.js';

export class MemberService {
  static async getMembers({ status = MEMBER_STATUS.ALL, search = '', page = 1, limit = 20, isActive } = {}) {
    const filter = {};

    if (status && status !== MEMBER_STATUS.ALL && status.toLowerCase() !== 'all') {
      const lower = status.toLowerCase();
      if (lower === 'active' || lower === 'approved') {
        filter.status = { $in: ['approved', 'active', 'inactive'] };
      } else if (lower === 'rejected') {
        filter.status = 'rejected';
      } else if (lower === 'pending') {
        filter.status = 'pending';
      } else if (lower === 'inactive') {
        filter.status = { $in: ['approved', 'active', 'inactive'] };
        filter.isActive = false;
      } else {
        filter.status = lower;
      }
    }

    if (isActive !== undefined && isActive !== null && isActive !== '' && isActive !== 'all') {
      const activeBool = typeof isActive === 'boolean' ? isActive : (String(isActive).toLowerCase() === 'true' || String(isActive).toLowerCase() === 'active');
      filter.isActive = activeBool;
      // Active and Inactive activity states strictly apply to approved members, never count or include rejected members
      if (!filter.status) {
        filter.status = { $in: ['approved', 'active', 'inactive'] };
      }
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: reg },
        { business: reg },
        { mobile: reg },
        { email: reg },
        { membershipId: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 20);

    const [items, total, allCount, pendingCount, approvedCount, rejectedCount, activeCount, inactiveCount] = await Promise.all([
      Member.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Member.countDocuments(filter),
      Member.countDocuments({}),
      Member.countDocuments({ status: 'pending' }),
      Member.countDocuments({ status: { $in: ['approved', 'active', 'inactive'] } }),
      Member.countDocuments({ status: 'rejected' }),
      Member.countDocuments({ isActive: true, status: { $in: ['approved', 'active', 'inactive'] } }),
      Member.countDocuments({ isActive: false, status: { $in: ['approved', 'active', 'inactive'] } }),
    ]);

    const counts = {
      all: allCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      active: activeCount,
      inactive: inactiveCount,
    };

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
      counts,
    };
  }

  static async getStats() {
    const [all, pending, approved, rejected, active, inactive] = await Promise.all([
      Member.countDocuments({}),
      Member.countDocuments({ status: 'pending' }),
      Member.countDocuments({ status: { $in: ['approved', 'active', 'inactive'] } }),
      Member.countDocuments({ status: 'rejected' }),
      Member.countDocuments({ isActive: true, status: { $in: ['approved', 'active', 'inactive'] } }),
      Member.countDocuments({ isActive: false, status: { $in: ['approved', 'active', 'inactive'] } }),
    ]);

    return { all, pending, approved, rejected, active, inactive };
  }

  static async getMemberById(id) {
    const member = await Member.findOne(buildIdQuery(id));
    if (!member) {
      throw ApiError.notFound(`Member with ID '${id}' was not found`);
    }
    return member;
  }

  static async getMemberIdCard(id) {
    const member = await this.getMemberById(id);
    const m = typeof member.toJSON === 'function' ? member.toJSON() : member;
    return {
      id: m.id,
      membershipId: m.membershipId,
      name: m.name,
      business: m.business,
      mobile: m.mobile,
      email: m.email,
      avatar: m.avatar,
      city: m.city,
      joinedOn: m.joinedOn,
      idCard: m.idCard,
    };
  }

  static async updateStatus(id, rawStatus, reason = '') {
    const statusLower = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
    let finalStatus = 'active';
    let isActive = true;

    if (statusLower === 'approved') {
      finalStatus = 'approved';
      isActive = true;
    } else if (statusLower === 'active') {
      finalStatus = 'active';
      isActive = true;
    } else if (statusLower === 'rejected') {
      finalStatus = 'rejected';
      isActive = false;
    } else if (statusLower === 'inactive') {
      finalStatus = 'inactive';
      isActive = false;
    } else if (statusLower === 'pending') {
      finalStatus = 'pending';
      isActive = false;
    } else {
      finalStatus = statusLower || 'active';
      isActive = finalStatus === 'active' || finalStatus === 'approved';
    }

    const cardStatus = isActive ? 'active' : 'inactive';
    const isInactive = !isActive;

    const updated = await Member.findOneAndUpdate(
      buildIdQuery(id),
      {
        status: finalStatus,
        isActive,
        rejectionReason: isInactive ? reason : (reason || ''),
        'idCard.status': cardStatus,
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw ApiError.notFound(`Member with ID '${id}' was not found`);
    }

    // Sync linked User account status & isActive
    try {
      let memberUser = updated.createdByUser ? await User.findById(updated.createdByUser) : null;
      if (!memberUser && updated.email) {
        memberUser = await User.findOne({ email: updated.email.trim().toLowerCase() });
      }
      if (memberUser) {
        memberUser.status = isActive ? 'active' : 'inactive';
        memberUser.isActive = isActive;
        await memberUser.save();
      }
    } catch (uErr) {
      console.error('Failed to sync linked user status:', uErr);
    }

    // If member status changed to rejected or inactive, remove from all committee positions
    if (isInactive) {
      try {
        await CommitteeService.removeMemberFromAllCommittees(updated.id);
      } catch (err) {
        console.error('Failed to remove rejected/inactive member from committees:', err);
      }
    }

    return updated;
  }

  static async updateMember(id, updates) {
    const cleanUpdates = { ...updates };
    delete cleanUpdates._id;
    delete cleanUpdates.id;

    if (cleanUpdates.reason !== undefined && cleanUpdates.rejectionReason === undefined) {
      cleanUpdates.rejectionReason = cleanUpdates.reason;
    }
    if (cleanUpdates.fullName && !cleanUpdates.name) {
      cleanUpdates.name = cleanUpdates.fullName;
    }
    if (cleanUpdates.businessName && !cleanUpdates.business) {
      cleanUpdates.business = cleanUpdates.businessName;
    }
    if (cleanUpdates.phone && !cleanUpdates.mobile) {
      cleanUpdates.mobile = cleanUpdates.phone;
    }
    if (cleanUpdates.mobile) {
      cleanUpdates.mobile = String(cleanUpdates.mobile).trim();
      if (!/^\d{10}$/.test(cleanUpdates.mobile)) {
        throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
      }
    }
    if (cleanUpdates.status !== undefined) {
      const raw = String(cleanUpdates.status).trim().toLowerCase();
      let finalStatus = 'approved';
      if (raw === 'approved' || raw === 'active') {
        finalStatus = 'approved';
      } else if (raw === 'rejected') {
        finalStatus = 'rejected';
      } else if (raw === 'pending') {
        finalStatus = 'pending';
      } else if (raw === 'inactive') {
        finalStatus = 'approved';
        cleanUpdates.isActive = false;
      } else {
        finalStatus = raw;
      }
      cleanUpdates.status = finalStatus;
    }

    if (cleanUpdates.isActive !== undefined) {
      const isActive = typeof cleanUpdates.isActive === 'boolean'
        ? cleanUpdates.isActive
        : (String(cleanUpdates.isActive).toLowerCase() === 'true' || String(cleanUpdates.isActive).toLowerCase() === 'active');
      cleanUpdates.isActive = isActive;
      cleanUpdates['idCard.status'] = isActive ? 'active' : 'inactive';
    }
    if (cleanUpdates.image && !cleanUpdates.avatar) {
      cleanUpdates.avatar = cleanUpdates.image;
    } else if (cleanUpdates.profilePhoto && !cleanUpdates.avatar) {
      cleanUpdates.avatar = cleanUpdates.profilePhoto;
    }
    if (cleanUpdates.membershipId) {
      cleanUpdates['idCard.cardNumber'] = cleanUpdates.membershipId;
      cleanUpdates['idCard.qrCode'] = `https://yourdomain.com/verify/${cleanUpdates.membershipId}`;
    }

    const existing = await Member.findOne(buildIdQuery(id));
    if (existing && existing.status === 'inactive' && cleanUpdates.status === undefined) {
      cleanUpdates.status = 'approved';
    }

    if (cleanUpdates.password && typeof cleanUpdates.password === 'string' && cleanUpdates.password.trim().length >= 6) {
      const pwd = cleanUpdates.password.trim();
      if (existing) {
        let memberUser = existing.createdByUser ? await User.findById(existing.createdByUser) : null;
        if (!memberUser && existing.email) {
          memberUser = await User.findOne({ email: existing.email.trim().toLowerCase() });
        }
        if (memberUser) {
          memberUser.password = pwd;
          await memberUser.save();
        }
        const salt = await bcrypt.genSalt(10);
        cleanUpdates.password = await bcrypt.hash(pwd, salt);
      }
    } else {
      delete cleanUpdates.password;
    }
    delete cleanUpdates.confirmPassword;

    const updated = await Member.findOneAndUpdate(
      buildIdQuery(id),
      cleanUpdates,
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw ApiError.notFound(`Member with ID '${id}' was not found`);
    }

    // If status updated to rejected or inactive, remove from all committee positions
    if (cleanUpdates.status === 'rejected' || cleanUpdates.status === 'inactive') {
      try {
        await CommitteeService.removeMemberFromAllCommittees(updated.id);
      } catch (err) {
        console.error('Failed to remove member from committees:', err);
      }
    }

    return updated;
  }

  static async deleteMember(id) {
    const deleted = await Member.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Member with ID '${id}' was not found`);
    }

    // Cascade delete: automatically remove deleted member from all committee positions
    try {
      await CommitteeService.removeMemberFromAllCommittees(deleted.id);
    } catch (err) {
      console.error('Failed to remove deleted member from committees:', err);
    }

    return deleted;
  }

  static async createMember(memberData, { creator = null, userId = null, role = null, user = null } = {}) {
    // Determine safeCreator:
    // If request body explicitly says 'user' -> 'user'
    // If request body says 'admin' -> only allowed if caller is admin
    // If caller is admin (e.g. from /admin/members or logged in admin) -> 'admin'
    // Otherwise -> 'user'
    const bodyCreatedBy = memberData.created_by ? String(memberData.created_by).trim().toLowerCase() : null;
    const roleToCheck = (role || user?.role || '').trim().toLowerCase();
    const isAdminUser = roleToCheck === 'admin' || roleToCheck === 'super admin';

    let safeCreator = 'user';
    if (bodyCreatedBy === 'user') {
      safeCreator = 'user';
    } else if (bodyCreatedBy === 'admin') {
      safeCreator = isAdminUser || creator === 'admin' ? 'admin' : 'user';
    } else if (creator === 'user') {
      safeCreator = 'user';
    } else if (creator === 'admin' || isAdminUser) {
      safeCreator = 'admin';
    } else {
      safeCreator = 'user';
    }

    const name = (memberData.name || memberData.fullName || '').trim();
    const business = (memberData.business || memberData.businessName || '').trim();
    const mobile = (memberData.mobile || memberData.phone || '').trim();
    const email = (memberData.email || '').trim().toLowerCase();
    const avatar = memberData.avatar || memberData.image || memberData.profilePhoto || null;

    if (!mobile) {
      throw ApiError.badRequest('Mobile number is required and must be a valid 10-digit number');
    }
    if (!/^\d{10}$/.test(mobile)) {
      throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
    }

    // Password for member's login account (Strictly Required)
    const rawPassword = memberData.password ? String(memberData.password).trim() : '';
    if (!rawPassword) {
      throw ApiError.badRequest('Password is required and must be at least 6 characters');
    }
    if (rawPassword.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }
    const passwordToSet = rawPassword;

    // Validate duplicates for mobile and email
    if (mobile) {
      const existingMobile = await Member.findOne({ mobile });
      if (existingMobile) {
        throw ApiError.conflict(`A member with mobile number '${mobile}' already exists`);
      }
    }

    if (email) {
      const existingEmail = await Member.findOne({ email });
      if (existingEmail) {
        throw ApiError.conflict(`A member with email '${email}' already exists`);
      }
    }

    // Determine status, isActive & card status based on creator
    let status;
    let isActive;
    let cardStatus;
    let rejectionReason = '';

    if (safeCreator === 'user') {
      // Mobile user registration is strictly pending
      status = 'pending';
      isActive = false;
      cardStatus = 'inactive';
      rejectionReason = '';
    } else {
      // Admin creation
      let rawStatus = memberData.status;
      if (typeof rawStatus === 'string') {
        rawStatus = rawStatus.trim().toLowerCase();
      }
      const isExplicitInactive = memberData.isActive === false || memberData.isActive === 'false' || rawStatus === 'inactive' || rawStatus === 'rejected';
      if (isExplicitInactive) {
        status = rawStatus === 'rejected' ? 'rejected' : 'approved';
        isActive = false;
        cardStatus = 'inactive';
        rejectionReason = memberData.rejectionReason !== undefined
          ? memberData.rejectionReason
          : (memberData.reason !== undefined ? memberData.reason : '');
      } else {
        status = rawStatus && rawStatus !== 'inactive' && rawStatus !== 'rejected' ? (rawStatus === 'active' ? 'approved' : rawStatus) : 'approved';
        isActive = true;
        cardStatus = 'active';
        rejectionReason = '';
      }
    }

    // Automatically create or link User account with role 'Member' and password
    // so this member can log into the mobile app with their email and password
    let userObjectId = null;
    let memberUser = null;
    if (email) {
      memberUser = await User.findOne({ email });
    }
    if (!memberUser && mobile) {
      memberUser = await User.findOne({ mobile });
    }

    if (memberUser) {
      if (memberData.password && memberData.password.trim()) {
        memberUser.password = memberData.password.trim();
        await memberUser.save();
      }
      userObjectId = memberUser._id;
    } else {
      let newUserId;
      try {
        newUserId = await getNextSequence('users');
      } catch {
        const maxUser = await User.findOne().sort({ id: -1 });
        newUserId = maxUser && maxUser.id ? maxUser.id + 1 : 1;
      }

      memberUser = await User.create({
        id: newUserId,
        name: name || memberData.name || 'Member',
        fullName: name || memberData.name || 'Member',
        email,
        mobile,
        password: passwordToSet,
        role: 'Member',
        dob: memberData.dob || memberData.dateOfBirth || '',
        address: memberData.address || '',
        city: memberData.city || 'Ahmedabad',
        pincode: memberData.pincode || '380009',
        avatar: avatar || null,
        isActive,
        status: status === 'inactive' ? 'inactive' : (status === 'pending' ? 'pending' : 'active'),
      });
      userObjectId = memberUser._id;
    }

    let id = await getNextSequence('members');

    const buildPayload = (assignedId) => {
      const mid = (safeCreator === 'admin' && memberData.membershipId)
        ? memberData.membershipId
        : `JBAD${150 + assignedId}`;
      const joinedDate = formatDateOnly(memberData.joinedOn || new Date());

      const cleanData = { ...memberData };
      delete cleanData._id;
      delete cleanData.id;
      delete cleanData.created_by;
      delete cleanData.createdByUser;
      delete cleanData.password;
      delete cleanData.confirmPassword;
      delete cleanData.status;
      delete cleanData.isActive;

      if (safeCreator === 'user') {
        delete cleanData.membershipId;
        delete cleanData.idCard;
        delete cleanData.rejectionReason;
        delete cleanData.reason;
      }

      return {
        ...cleanData,
        id: assignedId,
        membershipId: mid,
        name: name || memberData.name,
        business: business || memberData.business,
        mobile: mobile || memberData.mobile,
        email: email || memberData.email,
        password: passwordToSet,
        avatar,
        joinedOn: joinedDate,
        isActive,
        status,
        rejectionReason: status === 'inactive' ? rejectionReason : '',
        created_by: safeCreator,
        createdByUser: userObjectId,
        idCard: {
          cardNumber: mid,
          status: (safeCreator === 'admin' && memberData.idCard?.status) ? memberData.idCard.status : cardStatus,
          issuedAt: (safeCreator === 'admin' && memberData.idCard?.issuedAt) ? formatDateOnly(memberData.idCard.issuedAt) : joinedDate,
          validUntil: memberData.idCard?.validUntil || null,
          qrCode: memberData.idCard?.qrCode || `https://yourdomain.com/verify/${mid}`,
        },
      };
    };

    try {
      const newMember = await Member.create(buildPayload(id));
      return newMember;
    } catch (err) {
      if (err.code === 11000) {
        id = await getNextSequence('members');
        return await Member.create(buildPayload(id));
      }
      throw err;
    }
  }

  static async findMemberForUser(user) {
    if (!user) {
      throw ApiError.unauthorized('Authentication required');
    }

    let member = null;

    // 1. Try finding by createdByUser
    if (user._id && mongoose.Types.ObjectId.isValid(user._id)) {
      member = await Member.findOne({ createdByUser: user._id });
    }
    if (!member && user.id) {
      if (mongoose.Types.ObjectId.isValid(user.id)) {
        member = await Member.findOne({ createdByUser: user.id });
      }
      if (!member) {
        const userDoc = await User.findOne({ id: user.id });
        if (userDoc) {
          member = await Member.findOne({ createdByUser: userDoc._id });
        }
      }
    }

    // 2. Fallback to email
    if (!member && user.email) {
      member = await Member.findOne({ email: user.email.trim().toLowerCase() });
    }

    // 3. Fallback to mobile
    if (!member && user.mobile) {
      member = await Member.findOne({ mobile: user.mobile.trim() });
    }

    return member;
  }

  static async getMemberProfile(user) {
    const member = await this.findMemberForUser(user);
    if (!member) {
      throw ApiError.notFound('Member profile not found for this user');
    }
    return member;
  }

  static async updateMemberProfile(user, updates = {}, file = null) {
    const member = await this.findMemberForUser(user);
    if (!member) {
      throw ApiError.notFound('Member profile not found for this user');
    }

    const cleanUpdates = {};

    // Permitted fields only
    if (updates.name || updates.fullName) {
      cleanUpdates.name = (updates.name || updates.fullName).trim();
    }
    if (updates.business || updates.businessName) {
      cleanUpdates.business = (updates.business || updates.businessName).trim();
    }
    if (updates.city !== undefined) cleanUpdates.city = updates.city;
    if (updates.dob !== undefined) cleanUpdates.dob = updates.dob;
    if (updates.address !== undefined) cleanUpdates.address = updates.address;
    if (updates.pincode !== undefined) cleanUpdates.pincode = updates.pincode;
    if (updates.businessType !== undefined) cleanUpdates.businessType = updates.businessType;

    // Handle avatar
    if (file) {
      cleanUpdates.avatar = file.filename ? `/uploads/${file.filename}` : (file.path || file.url);
    } else if (updates.avatar !== undefined || updates.image !== undefined || updates.profilePhoto !== undefined) {
      cleanUpdates.avatar = updates.avatar || updates.image || updates.profilePhoto || null;
    }

    // Mobile update with uniqueness check
    const newMobile = (updates.mobile || updates.phone || '').trim();
    if (newMobile) {
      if (!/^\d{10}$/.test(newMobile)) {
        throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
      }
      if (newMobile !== member.mobile) {
        const existingMobile = await Member.findOne({ mobile: newMobile, id: { $ne: member.id } });
        if (existingMobile) {
          throw ApiError.conflict(`Mobile number '${newMobile}' is already in use by another member`);
        }
        cleanUpdates.mobile = newMobile;
      }
    }

    // Email update with uniqueness check
    const newEmail = (updates.email || '').trim().toLowerCase();
    if (newEmail && newEmail !== member.email) {
      const existingEmail = await Member.findOne({ email: newEmail, id: { $ne: member.id } });
      if (existingEmail) {
        throw ApiError.conflict(`Email '${newEmail}' is already in use by another member`);
      }
      cleanUpdates.email = newEmail;
    }

    // Password update for member's login account
    if (updates.password && typeof updates.password === 'string' && updates.password.trim().length >= 6) {
      let memberUser = member.createdByUser ? await User.findById(member.createdByUser) : null;
      if (!memberUser && member.email) {
        memberUser = await User.findOne({ email: member.email.trim().toLowerCase() });
      }
      if (memberUser) {
        memberUser.password = updates.password.trim();
        await memberUser.save();
      }
    }

    const updated = await Member.findOneAndUpdate(
      { id: member.id },
      cleanUpdates,
      { returnDocument: 'after' }
    );

    return updated;
  }

  static async backfillCreatedBy() {
    const result = await Member.updateMany(
      {
        $or: [
          { created_by: { $exists: false } },
          { created_by: null },
          { created_by: '' },
        ],
      },
      { $set: { created_by: 'admin' } }
    );
    return result;
  }

  static async bulkCreateMembers(membersList, { creator = 'admin', user = null } = {}) {
    if (!Array.isArray(membersList) || membersList.length === 0) {
      throw ApiError.badRequest('No member records provided for import');
    }

    const createdMembers = [];
    const errors = [];

    for (let i = 0; i < membersList.length; i++) {
      const row = membersList[i];
      try {
        const rowPassword = (row.password && String(row.password).trim()) || 'Member@123';
        const created = await this.createMember({ ...row, password: rowPassword }, { creator, user, role: user?.role });
        createdMembers.push(created);
      } catch (err) {
        errors.push({
          row: i + 1,
          name: row.name || row.fullName || 'Unknown',
          error: err.message,
        });
      }
    }

    return {
      success: true,
      total: membersList.length,
      importedCount: createdMembers.length,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      data: createdMembers,
    };
  }

  /**
   * Register a new member from mobile app (creates User account with role 'Member' and Member entry).
   */
  static async registerMobileMember(data, file = null, { creator = 'user', user = null } = {}) {
    const name = (data.name || data.fullName || '').trim();
    const business = (data.business || data.businessName || 'Business').trim();
    const mobile = (data.mobile || data.phone || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const rawPassword = data.password ? String(data.password).trim() : '';

    if (!email) throw ApiError.badRequest('Valid email address is required');
    if (!mobile) throw ApiError.badRequest('Mobile number is required and must be a valid 10-digit number');
    if (!/^\d{10}$/.test(mobile)) throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
    if (!name) throw ApiError.badRequest('Name is required');
    if (!rawPassword) throw ApiError.badRequest('Password is required and must be at least 6 characters');
    if (rawPassword.length < 6) throw ApiError.badRequest('Password must be at least 6 characters');
    const password = rawPassword;
    const avatar = file
      ? (file.filename ? `/uploads/${file.filename}` : (file.path || file.url))
      : (data.avatar || data.image || data.profilePhoto || null);

    // Check existing email or mobile in User and Member
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
    });
    if (existingUser) {
      if (existingUser.email === email) {
        throw ApiError.conflict(`An account with email '${email}' already exists`);
      }
      throw ApiError.conflict(`An account with mobile number '${mobile}' already exists`);
    }

    const existingMember = await Member.findOne({
      $or: [{ email }, { mobile }],
    });
    if (existingMember) {
      if (existingMember.email === email) {
        throw ApiError.conflict(`A member with email '${email}' already exists`);
      }
      throw ApiError.conflict(`A member with mobile number '${mobile}' already exists`);
    }

    // 1. Create User account with role 'Member'
    let userId;
    try {
      userId = await getNextSequence('users');
    } catch {
      const maxUser = await User.findOne().sort({ id: -1 });
      userId = maxUser && maxUser.id ? maxUser.id + 1 : 1;
    }

    const newUser = await User.create({
      id: userId,
      name,
      fullName: name,
      email,
      mobile,
      password,
      role: 'Member',
      dob: data.dob || data.dateOfBirth || '',
      dateOfBirth: data.dob || data.dateOfBirth || '',
      gender: data.gender || 'Male',
      address: data.address || '',
      city: data.city || 'Ahmedabad',
      pincode: data.pincode || '380009',
      avatar: avatar || null,
      profilePhoto: avatar || null,
      image: avatar || null,
      isActive: false,
      status: 'pending',
    });

    // 2. Create Member entry (Mobile registration is strictly 'user' and 'pending')
    const createdMember = await this.createMember(
      {
        ...data,
        name,
        business,
        mobile,
        email,
        password,
        avatar,
        created_by: 'user',
        status: 'pending',
        isActive: false,
      },
      { creator: 'user', userId: newUser._id, role: 'Member', user: newUser }
    );

    const tokens = AuthService.generateTokens(newUser);
    const memberData = createdMember.toObject ? createdMember.toObject() : { ...createdMember };
    delete memberData.password;

    return {
      user: newUser,
      member: memberData,
      token: tokens.token,
    };
  }

  /**
   * Authenticate mobile member by email and password.
   */
  static async loginMobileMember({ email, mobile, phone, username, password }) {
    if (!password) {
      throw ApiError.badRequest('Password is required');
    }

    const identifier = (email || mobile || phone || username || '').trim();
    if (!identifier) {
      throw ApiError.badRequest('Email is required');
    }

    const normalizedEmail = identifier.toLowerCase();

    // 1. Find User by email (supports mobile fallback)
    let user = await User.findOne({
      $or: [{ email: normalizedEmail }, { mobile: identifier }],
    });

    // 2. Fallback: check if member exists and find linked User
    if (!user) {
      const member = await Member.findOne({
        $or: [{ email: normalizedEmail }, { mobile: identifier }],
      });
      if (member && member.createdByUser) {
        user = await User.findById(member.createdByUser);
      }
    }

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 3. Find corresponding member profile
    const memberDoc = await this.findMemberForUser(user);
    const memberData = memberDoc
      ? (memberDoc.toObject ? memberDoc.toObject() : { ...memberDoc })
      : {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role || 'Member',
          status: user.status || 'approved',
          city: user.city || 'Ahmedabad',
          avatar: user.avatar || user.image || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

    delete memberData.password;

    const tokens = AuthService.generateTokens(user);

    return {
      user,
      member: memberData,
      token: tokens.token,
    };
  }

  /**
   * Member forgot password request (sends reset email).
   */
  static async forgotMemberPassword({ email, mobile, phone }) {
    let targetEmail = (email || '').trim().toLowerCase();

    if (!targetEmail) {
      const mob = (mobile || phone || '').trim();
      if (!mob) {
        throw ApiError.badRequest('Email or mobile number is required');
      }
      const user = await User.findOne({ mobile: mob });
      if (user && user.email) {
        targetEmail = user.email;
      } else {
        const mem = await Member.findOne({ mobile: mob });
        if (mem && mem.email) {
          targetEmail = mem.email;
        }
      }
    }

    if (!targetEmail) {
      return {
        success: true,
        message: 'If an account exists with this email or mobile, a password reset link will be sent.',
      };
    }

    return await AuthService.forgotPassword(targetEmail);
  }

  /**
   * Member reset password using reset token.
   */
  static async resetMemberPassword({ token, newPassword, confirmPassword, email }) {
    return await AuthService.resetPassword({ token, newPassword, confirmPassword, email });
  }

  /**
   * Member change password for authenticated user.
   */
  static async changeMemberPassword({ userId, email, currentPassword, newPassword, confirmPassword }) {
    return await AuthService.changePassword({
      userId,
      email,
      currentPassword,
      newPassword,
      confirmNewPassword: confirmPassword,
    });
  }
}
