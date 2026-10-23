import { Member } from '../models/Member.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';
import { MEMBER_STATUS } from '../constants/status.js';
import { formatDateOnly } from '../utils/dateFormatter.js';

export class MemberService {
  static async getMembers({ status = MEMBER_STATUS.ALL, search = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (status && status !== MEMBER_STATUS.ALL) {
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

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

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

  static async updateStatus(id, status, reason = '') {
    const updated = await Member.findOneAndUpdate(
      buildIdQuery(id),
      {
        status,
        rejectionReason: status === 'rejected' ? reason : (reason || ''),
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw ApiError.notFound(`Member with ID '${id}' was not found`);
    }

    return updated;
  }

  static async updateMember(id, updates) {
    if (updates.reason !== undefined && updates.rejectionReason === undefined) {
      updates.rejectionReason = updates.reason;
    }

    const updated = await Member.findOneAndUpdate(
      buildIdQuery(id),
      updates,
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
    const id = await getNextSequence('members');
    const rejectionReason = memberData.rejectionReason !== undefined
      ? memberData.rejectionReason
      : (memberData.reason !== undefined ? memberData.reason : '');

    const newMember = await Member.create({
      id,
      membershipId: memberData.membershipId || `JBAD${150 + id}`,
      joinedOn: formatDateOnly(memberData.joinedOn || new Date()),
      status: memberData.status || 'pending',
      ...memberData,
      rejectionReason,
    });
    return newMember;
  }
}
