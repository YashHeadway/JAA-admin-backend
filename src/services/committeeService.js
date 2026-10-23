import { Committee } from '../models/Committee.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class CommitteeService {
  static async getCommittee({ search = '', position = '', gender = '', businessType = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (position && position !== 'all' && position !== 'All') {
      filter.position = position;
    }

    if (gender && gender !== 'all' && gender !== 'All') {
      filter.gender = gender;
    }

    if (businessType && businessType !== 'all' && businessType !== 'All') {
      filter.businessType = businessType;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: reg },
        { position: reg },
        { role: reg },
        { mobile: reg },
        { email: reg },
        { businessName: reg },
        { businessType: reg },
        { address: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Committee.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Committee.countDocuments(filter),
    ]);

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
    };
  }

  static async getCommitteeById(id) {
    const member = await Committee.findOne(buildIdQuery(id));
    if (!member) {
      throw ApiError.notFound(`Committee member with ID '${id}' was not found`);
    }
    return member;
  }

  static async createCommittee(data) {
    const id = await getNextSequence('committees');

    const newMember = await Committee.create({
      id,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      mobile: data.mobile,
      email: data.email,
      address: data.address,
      position: data.position,
      role: data.role || 'Committee Member',
      businessName: data.businessName,
      businessType: data.businessType,
      gstNumber: data.gstNumber || '',
    });
    return newMember;
  }

  static async updateCommittee(id, updates) {
    const allowed = [
      'fullName',
      'dateOfBirth',
      'gender',
      'mobile',
      'email',
      'address',
      'position',
      'role',
      'businessName',
      'businessType',
      'gstNumber',
    ];
    const filteredUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const updated = await Committee.findOneAndUpdate(buildIdQuery(id), filteredUpdates, { returnDocument: 'after' });
    if (!updated) {
      throw ApiError.notFound(`Committee member with ID '${id}' was not found`);
    }
    return updated;
  }

  static async deleteCommittee(id) {
    const deleted = await Committee.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Committee member with ID '${id}' was not found`);
    }
    return deleted;
  }
}
