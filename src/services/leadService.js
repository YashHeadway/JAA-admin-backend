import mongoose from 'mongoose';
import { Lead } from '../models/Lead.js';
import { Member } from '../models/Member.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export const formatLeadListItem = (lead) => {
  const l = lead.toObject ? lead.toObject() : { ...lead };
  const createdAtIso = l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString();
  const updatedAtIso = l.updatedAt ? new Date(l.updatedAt).toISOString() : createdAtIso;

  return {
    id: l.id || 1,
    title: l.title || l.leadName || l.name || 'Gold Worker Required',
    description: l.description || '',
    image: l.image || 'https://yourdomain.com/uploads/gold-worker.jpg',
    status: (l.status || 'ACTIVE').toUpperCase(),
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
  };
};

export const formatLeadDetail = (lead, memberDoc = null) => {
  const l = lead.toObject ? lead.toObject() : { ...lead };
  const m = memberDoc || lead.memberId;
  const memberJson = m && typeof m.toJSON === 'function' ? m.toJSON() : (m ? { ...m } : null);

  if (memberJson) {
    delete memberJson._id;
    delete memberJson.__v;
    delete memberJson.idCard;
    delete memberJson.rejectionReason;
    delete memberJson.status;
    delete memberJson.joinedOn;
  }

  const memberForeignId = memberJson?.id || m?.id || (typeof l.memberId === 'number' ? l.memberId : 18);
  const createdAtIso = l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString();
  const updatedAtIso = l.updatedAt ? new Date(l.updatedAt).toISOString() : createdAtIso;

  return {
    id: l.id || 1,
    memberId: memberForeignId,
    title: l.title || l.leadName || l.name || 'Gold Worker Required',
    description: l.description || '',
    image: l.image || 'https://yourdomain.com/uploads/gold-worker.jpg',
    status: (l.status || 'ACTIVE').toUpperCase(),
    member: memberJson,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
  };
};

export class LeadService {
  static async getLeads({ search = '', status = '', page = 1, limit = 20 } = {}) {
    const filter = {};

    if (status && status !== 'All' && status !== 'all') {
      filter.status = new RegExp(`^${status.trim()}$`, 'i');
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: reg },
        { description: reg },
        { status: reg },
        { leadName: reg },
        { name: reg },
        { businessName: reg },
        { mobile: reg },
        { city: reg },
        { email: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 20);

    const [items, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1, id: -1 }).skip(skip).limit(parsedLimit),
      Lead.countDocuments(filter),
    ]);

    const formattedLeads = items.map(formatLeadListItem);
    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      leads: formattedLeads,
      pagination,
    };
  }

  static async getLeadById(id) {
    const query = buildIdQuery(id);
    let lead = await Lead.findOne(query).populate('memberId');
    if (!lead) {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }

    let member = lead.memberId;
    if (!member || typeof member !== 'object' || !member.id) {
      const rawMid = lead._doc?.memberId || lead.memberId;
      if (typeof rawMid === 'number') {
        member = await Member.findOne({ id: rawMid });
      } else if (rawMid && mongoose.Types.ObjectId.isValid(rawMid)) {
        member = await Member.findById(rawMid);
      }
      if (!member && lead.email) {
        member = await Member.findOne({ email: lead.email });
      }
      if (!member && lead.mobile) {
        member = await Member.findOne({ mobile: lead.mobile });
      }
      if (!member) {
        member = (await Member.findOne({ id: 18 })) || (await Member.findOne().sort({ id: 1 }));
      }
      if (member) {
        lead.memberId = member._id;
        await Lead.updateOne({ _id: lead._id }, { memberId: member._id });
      }
    }

    return formatLeadDetail(lead, member);
  }

  static async createLead(data) {
    let member = null;

    // 1. Check memberId
    if (data.memberId !== undefined && data.memberId !== null) {
      const midStr = String(data.memberId).trim();
      const num = Number(midStr);
      if (!isNaN(num) && num > 0) {
        member = await Member.findOne({ id: num });
      }
      if (!member && /^[0-9a-fA-F]{24}$/.test(midStr)) {
        member = await Member.findById(midStr);
      }
    }

    // 2. Check member object
    if (!member && data.member) {
      if (data.member.id) {
        member = await Member.findOne({ id: Number(data.member.id) });
      } else if (data.member._id && /^[0-9a-fA-F]{24}$/.test(String(data.member._id))) {
        member = await Member.findById(data.member._id);
      } else if (data.member.email) {
        member = await Member.findOne({ email: data.member.email });
      }
    }

    // 3. Check email or mobile
    if (!member && data.email) {
      member = await Member.findOne({ email: data.email });
    }
    if (!member && data.mobile) {
      member = await Member.findOne({ mobile: data.mobile });
    }

    // 4. Default fallback: Member 18 or first available member
    if (!member) {
      member = (await Member.findOne({ id: 18 })) || (await Member.findOne().sort({ id: 1 }));
    }

    const id = await getNextSequence('leads');
    const title = data.title || data.leadName || data.name || 'Gold Worker Required';
    const description = data.description || '';
    const image = data.image || (data.file ? `/uploads/${data.file.filename}` : 'https://yourdomain.com/uploads/gold-worker.jpg');
    const status = (data.status || 'ACTIVE').toUpperCase();

    const newLead = await Lead.create({
      id,
      memberId: member ? member._id : undefined,
      title,
      description,
      image,
      status,
      leadName: title,
      name: title,
      businessName: member?.business || data.businessName || 'test',
      mobile: member?.mobile || data.mobile || '9737126164',
      email: member?.email || data.email || 'testt@gmail.com',
      businessType: member?.businessType || data.businessType || 'test',
      city: member?.city || data.city || 'Ahmedabad',
      pincode: member?.pincode || data.pincode || '380009',
      address: member?.address || data.address || 'ahmedabad',
      source: data.source || 'Website',
    });

    return formatLeadDetail(newLead, member);
  }

  static async updateLead(id, updates) {
    let member = null;
    if (updates.memberId !== undefined && updates.memberId !== null) {
      const midStr = String(updates.memberId).trim();
      const num = Number(midStr);
      if (!isNaN(num) && num > 0) {
        member = await Member.findOne({ id: num });
      }
      if (!member && /^[0-9a-fA-F]{24}$/.test(midStr)) {
        member = await Member.findById(midStr);
      }
      if (member) {
        updates.memberId = member._id;
      }
    }

    if (updates.status) {
      updates.status = updates.status.toUpperCase();
    }
    if (updates.title && !updates.leadName) updates.leadName = updates.title;
    if (updates.leadName && !updates.title) updates.title = updates.leadName;

    const updated = await Lead.findOneAndUpdate(
      buildIdQuery(id),
      updates,
      { returnDocument: 'after' }
    ).populate('memberId');

    if (!updated) {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }

    const memberDoc = updated.memberId || member || (await Member.findOne({ id: 18 })) || (await Member.findOne().sort({ id: 1 }));
    return formatLeadDetail(updated, memberDoc);
  }

  static async deleteLead(id) {
    const deleted = await Lead.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }
    return { id: deleted.id };
  }

  static async importLeads(leads = []) {
    if (!Array.isArray(leads) || leads.length === 0) {
      return { success: true, count: 0, data: [] };
    }

    const defaultMember = (await Member.findOne({ id: 18 })) || (await Member.findOne().sort({ id: 1 }));
    const insertedDocs = [];

    for (const item of leads) {
      const id = await getNextSequence('leads');
      const title = item.title || item.leadName || item.name || 'Gold Worker Required';
      const status = (item.status || 'ACTIVE').toUpperCase();
      insertedDocs.push({
        id,
        memberId: item.memberId || (defaultMember ? defaultMember._id : undefined),
        title,
        description: item.description || '',
        image: item.image || 'https://yourdomain.com/uploads/gold-worker.jpg',
        status,
        leadName: title,
        name: title,
        businessType: item.businessType || defaultMember?.businessType || 'test',
        businessName: item.businessName || defaultMember?.business || 'test',
        mobile: item.mobile || defaultMember?.mobile || '9737126164',
        email: item.email || defaultMember?.email || 'testt@gmail.com',
        city: item.city || defaultMember?.city || 'Ahmedabad',
        pincode: item.pincode || defaultMember?.pincode || '380009',
        address: item.address || defaultMember?.address || 'ahmedabad',
        source: item.source || 'Website',
      });
    }

    const result = await Lead.insertMany(insertedDocs);
    const formatted = result.map(formatLeadListItem);
    return { success: true, count: result.length, data: formatted };
  }
}
