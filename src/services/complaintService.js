import { Complaint } from '../models/Complaint.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class ComplaintService {
  static async getComplaints({ search = '', status = '', priority = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (priority && priority !== 'All') {
      filter.priority = priority;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { against: reg },
        { type: reg },
        { typeSubtitle: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Complaint.find(filter).sort({ id: 1 }).skip(skip).limit(parsedLimit),
      Complaint.countDocuments(filter),
    ]);

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
    };
  }

  static async getComplaintById(id) {
    const complaint = await Complaint.findOne(buildIdQuery(id));
    if (!complaint) {
      throw ApiError.notFound(`Complaint with ID '${id}' was not found`);
    }
    return complaint;
  }

  static async createComplaint(data) {
    const id = await getNextSequence('complaints');
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newComplaint = await Complaint.create({
      id,
      priority: data.priority || 'Medium',
      status: data.status || 'New',
      date,
      time,
      ...data,
    });
    return newComplaint;
  }

  static async updateStatus(id, status) {
    const updated = await Complaint.findOneAndUpdate(buildIdQuery(id), { status }, { returnDocument: 'after' });
    if (!updated) {
      throw ApiError.notFound(`Complaint with ID '${id}' was not found`);
    }
    return updated;
  }

  static async deleteComplaint(id) {
    const deleted = await Complaint.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Complaint with ID '${id}' was not found`);
    }
    return deleted;
  }
}
