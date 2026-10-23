import { Lead } from '../models/Lead.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class LeadService {
  static async getLeads({ search = '', status = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (status && status !== 'All' && status !== 'all') {
      filter.status = new RegExp(status.trim(), 'i');
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { leadName: reg },
        { name: reg },
        { businessName: reg },
        { mobile: reg },
        { city: reg },
        { email: reg },
        { source: reg },
        { status: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Lead.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
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
    const leadName = data.leadName || data.name || '';
    const newLead = await Lead.create({
      id,
      leadName,
      name: leadName,
      businessType: data.businessType || 'Retailer',
      city: data.city || 'Ahmedabad',
      source: data.source || 'Website',
      status: data.status || 'Newest',
      ...data,
      leadName,
      name: leadName,
    });
    return newLead;
  }

  static async updateLead(id, updates) {
    if (updates.leadName && !updates.name) updates.name = updates.leadName;
    if (updates.name && !updates.leadName) updates.leadName = updates.name;

    const updated = await Lead.findOneAndUpdate(
      buildIdQuery(id),
      updates,
      { returnDocument: 'after' }
    );
    if (!updated) {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }
    return updated;
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
      return { success: true, count: 0, data: [] };
    }

    const insertedDocs = [];
    for (const item of leads) {
      const id = await getNextSequence('leads');
      const leadName = item.leadName || item.name || '';
      insertedDocs.push({
        id,
        leadName,
        name: leadName,
        businessType: item.businessType || 'Retailer',
        city: item.city || 'Ahmedabad',
        source: item.source || 'Website',
        status: item.status || 'Newest',
        ...item,
        leadName,
        name: leadName,
      });
    }

    const result = await Lead.insertMany(insertedDocs);
    return { success: true, count: result.length, data: result };
  }
}
