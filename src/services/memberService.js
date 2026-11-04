import { Member } from '../models/Member.js';
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

  static async createMember(memberData) {
    let id = await getNextSequence('members');
    const rejectionReason = memberData.rejectionReason !== undefined
      ? memberData.rejectionReason
      : (memberData.reason !== undefined ? memberData.reason : '');

    const name = (memberData.name || memberData.fullName || '').trim();
    const business = (memberData.business || memberData.businessName || '').trim();
    const mobile = (memberData.mobile || memberData.phone || '').trim();
    const avatar = memberData.avatar || memberData.image || memberData.profilePhoto || null;

    // When admin creates any member, status automatically takes 'approved'
    // If explicitly provided as 'rejected', it remains 'rejected', otherwise automatically 'approved'
    let rawStatus = memberData.status;
    if (typeof rawStatus === 'string') {
      rawStatus = rawStatus.trim().toLowerCase();
    }
    const status = (rawStatus === 'rejected') ? 'rejected' : 'approved';
    const cardStatus = status === 'rejected' ? 'inactive' : 'active';

    const buildPayload = (assignedId) => {
      const mid = memberData.membershipId || `JBAD${150 + assignedId}`;
      const joinedDate = formatDateOnly(memberData.joinedOn || new Date());
      return {
        ...memberData,
        id: assignedId,
        membershipId: mid,
        name: name || memberData.name,
        business: business || memberData.business,
        mobile: mobile || memberData.mobile,
        avatar,
        joinedOn: joinedDate,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : '',
        idCard: {
          cardNumber: mid,
          status: memberData.idCard?.status || cardStatus,
          issuedAt: memberData.idCard?.issuedAt ? formatDateOnly(memberData.idCard.issuedAt) : joinedDate,
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

  static async bulkCreateMembers(membersList) {
    if (!Array.isArray(membersList) || membersList.length === 0) {
      throw ApiError.badRequest('No member records provided for import');
    }

    const createdMembers = [];
    const errors = [];

    for (let i = 0; i < membersList.length; i++) {
      const row = membersList[i];
      try {
        const created = await this.createMember(row);
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
