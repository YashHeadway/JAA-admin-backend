import { Lead } from '../models/Lead.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class LeadService {
  static async getLeads({ search = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: reg },
        { businessName: reg },
        { mobile: reg },
        { city: reg },
        { email: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Lead.find(filter).sort({ id: 1 }).skip(skip).limit(parsedLimit),
      Lead.countDocuments(filter),
    ]);

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
    };
  }

  static async getLeadById(id) {
    const lead = await Lead.findOne(buildIdQuery(id));
    if (!lead) {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }
    return lead;
  }

  static async createLead(data) {
    const id = await getNextSequence('leads');
    const newLead = await Lead.create({
      id,
      status: data.status || 'Newest',
      ...data,
    });
    return newLead;
  }

  static async deleteLead(id) {
    const deleted = await Lead.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }
    return deleted;
  }

  static async importLeads(leads = []) {
    if (!Array.isArray(leads) || leads.length === 0) {
      return { success: true, count: 0 };
    }

    const insertedDocs = [];
    for (const item of leads) {
      const id = await getNextSequence('leads');
      insertedDocs.push({
        id,
        status: 'Newest',
        ...item,
      });
    }

    const result = await Lead.insertMany(insertedDocs);
    return { success: true, count: result.length };
  }
}
