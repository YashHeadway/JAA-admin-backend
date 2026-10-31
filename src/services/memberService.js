import { Member } from '../models/Member.js';
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

    return updated;
  }

  static async deleteMember(id) {
    const deleted = await Member.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Member with ID '${id}' was not found`);
    }
    return deleted;
  }

  static async createMember(memberData) {
    let id = await getNextSequence('members');
    const rejectionReason = memberData.rejectionReason !== undefined
      ? memberData.rejectionReason
      : (memberData.reason !== undefined ? memberData.reason : '');

    const buildPayload = (assignedId) => {
      const mid = memberData.membershipId || `JBAD${150 + assignedId}`;
      const joinedDate = formatDateOnly(memberData.joinedOn || new Date());
      const cardStatus = memberData.status === 'rejected' ? 'inactive' : 'active';
      return {
        id: assignedId,
        membershipId: mid,
        joinedOn: joinedDate,
        status: memberData.status || 'pending',
        ...memberData,
        idCard: {
          cardNumber: mid,
          status: memberData.idCard?.status || cardStatus,
          issuedAt: memberData.idCard?.issuedAt ? formatDateOnly(memberData.idCard.issuedAt) : joinedDate,
          validUntil: memberData.idCard?.validUntil || null,
          qrCode: memberData.idCard?.qrCode || `https://yourdomain.com/verify/${mid}`,
        },
        rejectionReason,
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
}
