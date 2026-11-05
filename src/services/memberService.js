import mongoose from 'mongoose';
import { Member } from '../models/Member.js';
import { User } from '../models/User.js';
import { CommitteeService } from './committeeService.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';
import { MEMBER_STATUS } from '../constants/status.js';
import { formatDateOnly } from '../utils/dateFormatter.js';

export class MemberService {
  static async getMembers({ status = MEMBER_STATUS.ALL, search = '', page = 1, limit = 20 } = {}) {
    const filter = {};

    if (status && status !== MEMBER_STATUS.ALL && status.toLowerCase() !== 'all') {
      filter.status = status.toLowerCase();
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

    const [items, total, allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      Member.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Member.countDocuments(filter),
      Member.countDocuments({}),
      Member.countDocuments({ status: 'pending' }),
      Member.countDocuments({ status: 'approved' }),
      Member.countDocuments({ status: 'rejected' }),
    ]);

    const counts = {
      all: allCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
      counts,
    };
  }

  static async getStats() {
    const [all, pending, approved, rejected] = await Promise.all([
      Member.countDocuments({}),
      Member.countDocuments({ status: 'pending' }),
      Member.countDocuments({ status: 'approved' }),
      Member.countDocuments({ status: 'rejected' }),
    ]);

    return { all, pending, approved, rejected };
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

  static async updateStatus(id, status, reason = '') {
    const cardStatus = status === 'rejected' ? 'inactive' : 'active';
    const updated = await Member.findOneAndUpdate(
      buildIdQuery(id),
      {
        status,
        rejectionReason: status === 'rejected' ? reason : (reason || ''),
        'idCard.status': cardStatus,
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw ApiError.notFound(`Member with ID '${id}' was not found`);
    }

    // If member status changed to rejected or inactive, remove from all committee positions
    if (status === 'rejected' || status === 'inactive') {
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
    if (cleanUpdates.status && typeof cleanUpdates.status === 'string') {
      cleanUpdates.status = cleanUpdates.status.toLowerCase();
      cleanUpdates['idCard.status'] = cleanUpdates.status === 'rejected' ? 'inactive' : 'active';
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

  static async createMember(memberData, { creator = 'admin', userId = null } = {}) {
    const safeCreator = (creator === 'user') ? 'user' : 'admin';

    const name = (memberData.name || memberData.fullName || '').trim();
    const business = (memberData.business || memberData.businessName || '').trim();
    const mobile = (memberData.mobile || memberData.phone || '').trim();
    const email = (memberData.email || '').trim().toLowerCase();
    const avatar = memberData.avatar || memberData.image || memberData.profilePhoto || null;

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

    // Resolve user ObjectId if provided
    let userObjectId = null;
    if (userId) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userObjectId = userId;
      } else {
        const userDoc = await User.findOne({ id: userId });
        if (userDoc) {
          userObjectId = userDoc._id;
        }
      }
    }

    // Determine status & card status based on creator
    let status;
    let cardStatus;
    let rejectionReason = '';

    if (safeCreator === 'user') {
      // Mobile user registration is strictly pending
      status = 'pending';
      cardStatus = 'inactive';
      rejectionReason = '';
    } else {
      // Admin creation defaults to approved unless explicitly set to rejected
      let rawStatus = memberData.status;
      if (typeof rawStatus === 'string') {
        rawStatus = rawStatus.trim().toLowerCase();
      }
      status = (rawStatus === 'rejected') ? 'rejected' : 'approved';
      cardStatus = status === 'rejected' ? 'inactive' : 'active';
      rejectionReason = memberData.rejectionReason !== undefined
        ? memberData.rejectionReason
        : (memberData.reason !== undefined ? memberData.reason : '');
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

      if (safeCreator === 'user') {
        delete cleanData.status;
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
        avatar,
        joinedOn: joinedDate,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : '',
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
    if (newMobile && newMobile !== member.mobile) {
      const existingMobile = await Member.findOne({ mobile: newMobile, id: { $ne: member.id } });
      if (existingMobile) {
        throw ApiError.conflict(`Mobile number '${newMobile}' is already in use by another member`);
      }
      cleanUpdates.mobile = newMobile;
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

  static async bulkCreateMembers(membersList) {
    if (!Array.isArray(membersList) || membersList.length === 0) {
      throw ApiError.badRequest('No member records provided for import');
    }

    const createdMembers = [];
    const errors = [];

    for (let i = 0; i < membersList.length; i++) {
      const row = membersList[i];
      try {
        const created = await this.createMember(row, { creator: 'admin' });
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
}
