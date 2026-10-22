import { Committee } from '../models/Committee.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class CommitteeService {
  static async getCommittee({ search = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: reg },
        { position: reg },
        { committee: reg },
        { phone: reg },
        { email: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Committee.find(filter).sort({ id: 1 }).skip(skip).limit(parsedLimit),
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
      status: data.status || 'Active',
      ...data,
    });
    return newMember;
  }

  static async updateCommittee(id, updates) {
    const updated = await Committee.findOneAndUpdate(buildIdQuery(id), updates, { returnDocument: 'after' });
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
