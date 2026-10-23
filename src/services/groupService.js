import { Group } from '../models/Group.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';
import { formatDateOnly } from '../utils/dateFormatter.js';

export class GroupService {
  static async getGroups({ search = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: reg }, { about: reg }];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Group.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Group.countDocuments(filter),
    ]);

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
    };
  }

  static async getGroupById(id) {
    const group = await Group.findOne(buildIdQuery(id));
    if (!group) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }
    return group;
  }

  static async createGroup(data) {
    const id = await getNextSequence('groups');
    const newGroup = await Group.create({
      id,
      memberCount: data.memberCount || 0,
      status: data.status ?? true,
      createdOn: formatDateOnly(data.createdOn || new Date()),
      createdBy: data.createdBy || 'Admin',
      recentBroadcasts: [],
      ...data,
    });
    return newGroup;
  }

  static async updateGroup(id, updates) {
    const updated = await Group.findOneAndUpdate(buildIdQuery(id), updates, { returnDocument: 'after' });
    if (!updated) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }
    return updated;
  }

  static async toggleStatus(id) {
    const group = await Group.findOne(buildIdQuery(id));
    if (!group) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }

    group.status = !group.status;
    await group.save();
    return group;
  }

  static async deleteGroup(id) {
    const deleted = await Group.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }
    return deleted;
  }
}
