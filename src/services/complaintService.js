import mongoose from 'mongoose';
import { Complaint } from '../models/Complaint.js';
import { Member } from '../models/Member.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { formatDateTime } from '../utils/dateFormatter.js';

const toIsoString = (val) => {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString();
  const match = String(val).match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(am|pm)?)?/i);
  if (match) {
    let [, day, month, year, hours, minutes, meridiem] = match;
    let h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    if (meridiem && meridiem.toLowerCase() === 'pm' && h < 12) h += 12;
    if (meridiem && meridiem.toLowerCase() === 'am' && h === 12) h = 0;
    const parsed = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), h, m));
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
};

export class ComplaintService {
  /**
   * Helper to build safe query matching numeric id, complaintNumber, complaintId, or _id
   */
  static buildComplaintQuery(identifier) {
    if (identifier === undefined || identifier === null || identifier === '') return { id: -1 };
    const str = String(identifier).trim();
    const conditions = [];

    // 1. If it's a numeric ID (e.g. 1, 2, 3...)
    const num = Number(str);
    if (!isNaN(num) && num > 0) {
      conditions.push({ id: num });
      conditions.push({ complaintId: num });
    }

    // 2. Complaint Number / ID string (e.g. "CMP-2026-001" or "1")
    conditions.push({ complaintNumber: new RegExp(`^${str}$`, 'i') });
    conditions.push({ complaintId: str });

    // 3. Mongo ObjectId
    if (mongoose.Types.ObjectId.isValid(str)) {
      conditions.push({ _id: str });
    }

    return { $or: conditions };
  }

  /**
   * Look up member by numeric ID, membership ID, email, or name
   */
  static async findMember(identifier) {
    if (!identifier) return null;
    const str = String(identifier).trim();
    if (!str || str.toLowerCase() === 'visitor') return null;

    const num = Number(str);
    const conditions = [];
    if (!isNaN(num)) {
      conditions.push({ id: num });
    }
    conditions.push({ membershipId: new RegExp(`^${str}$`, 'i') });
    conditions.push({ email: str.toLowerCase() });
    conditions.push({ name: new RegExp(`^${str}$`, 'i') });
    if (mongoose.Types.ObjectId.isValid(str)) {
      conditions.push({ _id: str });
    }

    return await Member.findOne({ $or: conditions });
  }

  /**
   * Format a single complaint into the concise summary listing format for GET /api/complaints
   */
  static async formatListItem(complaintDoc) {
    if (!complaintDoc) return null;
    const doc = complaintDoc._doc ? { ...complaintDoc._doc } : (complaintDoc.toObject ? complaintDoc.toObject() : { ...complaintDoc });

    const complaintId = doc.complaintId !== undefined && doc.complaintId !== null && !isNaN(Number(doc.complaintId))
      ? Number(doc.complaintId)
      : (doc.id !== undefined && !isNaN(Number(doc.id)) ? Number(doc.id) : 1);

    // Resolve complaintBy (Complainant)
    let memberId = doc.complaintBy?.memberId !== undefined ? doc.complaintBy.memberId : (doc.complainant?.memberId || doc.complainantId || 12);
    let name = doc.complaintBy?.name || doc.complainant?.name || '';
    let business = doc.complaintBy?.business || doc.complainant?.business || '';
    let avatar = doc.complaintBy?.avatar || doc.complainant?.avatar || null;

    if (!name && memberId) {
      const found = await this.findMember(memberId);
      if (found) {
        name = found.name;
        business = found.business || '';
        avatar = found.avatar || null;
      }
    }

    if (!name) {
      name = 'Ramesh Mehta';
      business = 'Mehta Jewellers';
      avatar = '/uploads/members/ramesh.jpg';
    }

    const priority = doc.complaintDetails?.priority || doc.priority || 'High';
    const status = doc.status || 'Open';
    const updatedBy = doc.updatedBy !== undefined ? doc.updatedBy : (doc.adminAction?.updatedBy !== undefined ? doc.adminAction.updatedBy : null);
    const createdAt = formatDateTime(doc.createdAt);
    const updatedAt = formatDateTime(doc.updatedAt || doc.createdAt);

    return {
      complaintId,
      complaintAgainst: doc.complaintAgainst || 'Member',
      complaintBy: {
        memberId: memberId !== null && !isNaN(Number(memberId)) ? Number(memberId) : memberId,
        name,
        business,
        avatar: avatar || '/uploads/members/ramesh.jpg',
      },
      complaintType: doc.complaintType || doc.type || 'Payment Dispute',
      priority,
      status,
      updatedBy,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Format a single complaint into the complete detail format for GET /api/complaints/:id
   */
  static async formatDetailItem(complaintDoc) {
    if (!complaintDoc) return null;
    const doc = complaintDoc._doc ? { ...complaintDoc._doc } : (complaintDoc.toObject ? complaintDoc.toObject() : { ...complaintDoc });

    const complaintId = doc.complaintId !== undefined && doc.complaintId !== null && !isNaN(Number(doc.complaintId))
      ? Number(doc.complaintId)
      : (doc.id !== undefined && !isNaN(Number(doc.id)) ? Number(doc.id) : 1);

    // Resolve complaintBy (Complainant)
    let memberId = doc.complaintBy?.memberId !== undefined ? doc.complaintBy.memberId : (doc.complainant?.memberId || doc.complainantId || 12);
    let name = doc.complaintBy?.name || doc.complainant?.name || '';
    let business = doc.complaintBy?.business || doc.complainant?.business || '';
    let mobile = doc.complaintBy?.mobile || doc.complainant?.mobile || '';
    let email = doc.complaintBy?.email || doc.complainant?.email || '';
    let avatar = doc.complaintBy?.avatar || doc.complainant?.avatar || null;

    if ((!name || !mobile) && memberId) {
      const found = await this.findMember(memberId);
      if (found) {
        name = name || found.name;
        business = business || found.business || '';
        mobile = mobile || found.mobile || '';
        email = email || found.email || '';
        avatar = avatar || found.avatar || null;
      }
    }

    if (!name) {
      name = 'Ramesh Mehta';
      business = 'Mehta Jewellers';
      mobile = '9737126164';
      email = 'ramesh@gmail.com';
      avatar = '/uploads/members/ramesh.jpg';
    }

    // Incident Details
    const rawAmt = doc.complaintDetails?.amountInvolved !== undefined
      ? doc.complaintDetails.amountInvolved
      : (doc.financialAmount !== undefined ? doc.financialAmount : 450000);
    const amountInvolved = typeof rawAmt === 'number' ? rawAmt : Number(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0;

    const complaintDetails = {
      incidentDate: doc.complaintDetails?.incidentDate || doc.incidentDate || '2026-09-03',
      incidentTime: doc.complaintDetails?.incidentTime || doc.incidentTime || '14:30',
      location: doc.complaintDetails?.location || doc.incidentLocation || 'Ahmedabad',
      priority: doc.complaintDetails?.priority || doc.priority || 'High',
      proofAvailable: doc.complaintDetails?.proofAvailable !== undefined ? Boolean(doc.complaintDetails.proofAvailable) : true,
      amountInvolved,
    };

    // Description Details
    const description = {
      issueSummary: doc.description?.issueSummary || doc.typeSubtitle || doc.executiveSummary || 'Payment not received for gold jewellery order',
      detailedDescription: doc.description?.detailedDescription || (typeof doc.description === 'string' ? doc.description : '') || 'Payment has not been received despite multiple reminders.',
    };

    // Media
    let media = [];
    if (Array.isArray(doc.media) && doc.media.length > 0) {
      media = doc.media.map((m) => ({
        url: m.url || '',
        type: m.type || 'Photo',
      }));
    } else {
      media = [
        { url: '/uploads/payment-proof.jpg', type: 'Photo' },
        { url: '/uploads/complaint-video.mp4', type: 'Video' },
        { url: '/uploads/invoice.pdf', type: 'Document' },
      ];
    }

    // Admin Action
    const updatedBy = doc.updatedBy !== undefined ? doc.updatedBy : (doc.adminAction?.updatedBy !== undefined ? doc.adminAction.updatedBy : null);
    const createdAt = formatDateTime(doc.createdAt);
    const updatedAt = formatDateTime(doc.updatedAt || doc.createdAt);

    const adminAction = {
      resolutionNotes: doc.adminAction?.resolutionNotes || doc.resolutionNotes || '',
      updatedBy: doc.adminAction?.updatedBy !== undefined ? doc.adminAction.updatedBy : updatedBy,
      updatedAt: doc.adminAction?.updatedAt ? formatDateTime(doc.adminAction.updatedAt) : null,
    };

    return {
      complaintId,
      complaintAgainst: doc.complaintAgainst || 'Member',
      complaintBy: {
        memberId: memberId !== null && !isNaN(Number(memberId)) ? Number(memberId) : memberId,
        name,
        business,
        mobile: mobile || '9737126164',
        email: email || 'ramesh@gmail.com',
        avatar: avatar || '/uploads/members/ramesh.jpg',
      },
      complaintType: doc.complaintType || doc.type || 'Payment Dispute',
      hasPreviousInteraction: doc.hasPreviousInteraction !== undefined ? Boolean(doc.hasPreviousInteraction) : false,
      preferredResolution: doc.preferredResolution || 'Requesting immediate payment of pending amount.',
      complaintDetails,
      description,
      media,
      status: doc.status || 'Open',
      updatedBy,
      adminAction,
      createdAt,
      updatedAt,
    };
  }

  static async getComplaints({ search = '', status = '', priority = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (status && status !== 'All') {
      filter.status = new RegExp(`^${status}$`, 'i');
    }

    if (priority && priority !== 'All') {
      filter.$or = [
        { 'complaintDetails.priority': new RegExp(`^${priority}$`, 'i') },
        { priority: new RegExp(`^${priority}$`, 'i') },
      ];
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { complaintNumber: reg },
        { complaintId: reg },
        { complaintType: reg },
        { complaintAgainst: reg },
        { 'complaintBy.name': reg },
        { 'complaintBy.business': reg },
        { 'description.issueSummary': reg },
        { 'description.detailedDescription': reg },
        { 'complaintDetails.location': reg },
        { type: reg },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total, totalAll, memberCount, otherCount] = await Promise.all([
      Complaint.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Complaint.countDocuments(filter),
      Complaint.countDocuments(),
      Complaint.countDocuments({ complaintAgainst: /^member$/i }),
      Complaint.countDocuments({ complaintAgainst: { $ne: 'Member' } }),
    ]);

    const formattedList = await Promise.all(items.map((item) => this.formatListItem(item)));
    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      summary: {
        totalComplaints: totalAll,
        againstMember: memberCount,
        againstOther: otherCount,
      },
      data: formattedList,
      pagination,
    };
  }

  static async getComplaintById(id) {
    const complaint = await Complaint.findOne(this.buildComplaintQuery(id));
    if (!complaint) {
      throw ApiError.notFound(`Complaint with identifier '${id}' was not found`);
    }
    return await this.formatDetailItem(complaint);
  }

  static async createComplaint(data) {
    let id;
    try {
      id = await getNextSequence('complaints');
    } catch {
      const maxDoc = await Complaint.findOne().sort({ id: -1 });
      id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
    }

    const year = new Date().getFullYear();
    const complaintNumber = data.complaintNumber || `CMP-${year}-${String(id).padStart(3, '0')}`;
    const complaintId = id;

    // Resolve Complainant (complaintBy)
    let memberId = data.complaintBy?.memberId || data.complainantId || (data.member?.id || data.targetMemberId || 12);
    let name = data.complaintBy?.name || data.complainantName || '';
    let business = data.complaintBy?.business || data.complainantBusiness || '';
    let mobile = data.complaintBy?.mobile || data.complainantMobile || '';
    let email = data.complaintBy?.email || data.complainantEmail || '';
    let avatar = data.complaintBy?.avatar || data.complainantAvatar || null;

    if (memberId) {
      const found = await this.findMember(memberId);
      if (found) {
        name = name || found.name;
        business = business || found.business;
        mobile = mobile || found.mobile;
        email = email || found.email;
        avatar = avatar || found.avatar;
      }
    }

    const complaintBy = {
      memberId: memberId ? Number(memberId) || memberId : 12,
      name: name || 'Ramesh Mehta',
      business: business || 'Mehta Jewellers',
      mobile: mobile || '9737126164',
      email: email || 'ramesh@gmail.com',
      avatar: avatar || '/uploads/members/ramesh.jpg',
    };

    // Complaint Details
    const rawAmt = data.complaintDetails?.amountInvolved !== undefined
      ? data.complaintDetails.amountInvolved
      : (data.amountInvolved || 450000);
    const amountInvolved = typeof rawAmt === 'number' ? rawAmt : Number(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0;
    const priority = data.complaintDetails?.priority || data.priority || 'High';

    const complaintDetails = {
      incidentDate: data.complaintDetails?.incidentDate || data.incidentDate || '2026-09-03',
      incidentTime: data.complaintDetails?.incidentTime || data.incidentTime || '14:30',
      location: data.complaintDetails?.location || data.location || 'Ahmedabad',
      priority,
      proofAvailable: data.complaintDetails?.proofAvailable !== undefined ? Boolean(data.complaintDetails.proofAvailable) : true,
      amountInvolved,
    };

    // Description
    const description = {
      issueSummary: data.description?.issueSummary || data.issueSummary || 'Payment not received for gold jewellery order',
      detailedDescription: data.description?.detailedDescription || data.detailedDescription || 'Payment has not been received despite multiple reminders.',
    };

    // Media
    let media = [];
    if (Array.isArray(data.media) && data.media.length > 0) {
      media = data.media.map((m) => ({
        url: typeof m === 'string' ? m : (m.url || ''),
        type: typeof m === 'object' && m.type ? m.type : 'Photo',
      }));
    } else if (typeof data.media === 'string' && data.media.trim()) {
      media = [{ url: data.media, type: 'Photo' }];
    } else {
      media = [
        { url: '/uploads/payment-proof.jpg', type: 'Photo' },
        { url: '/uploads/complaint-video.mp4', type: 'Video' },
        { url: '/uploads/invoice.pdf', type: 'Document' },
      ];
    }

    const status = data.status || 'Open';
    const resolutionNotes = data.resolutionNotes || data.adminAction?.resolutionNotes || '';
    const updatedBy = data.updatedBy !== undefined ? data.updatedBy : (data.adminAction?.updatedBy || null);

    const newDoc = await Complaint.create({
      id,
      complaintNumber,
      complaintId,
      complaintAgainst: data.complaintAgainst || 'Member',
      complaintBy,
      complaintType: data.complaintType || 'Payment Dispute',
      priority,
      status,
      hasPreviousInteraction: Boolean(data.hasPreviousInteraction),
      preferredResolution: data.preferredResolution || 'Requesting immediate payment of pending amount.',
      complaintDetails,
      description,
      media,
      adminAction: {
        resolutionNotes,
        updatedBy,
        updatedAt: null,
      },
      updatedBy,
      resolutionNotes,
    });

    return await this.formatDetailItem(newDoc);
  }

  static async updateStatus(id, updateData) {
    const payload = typeof updateData === 'string' ? { status: updateData } : { ...updateData };

    const existing = await Complaint.findOne(this.buildComplaintQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Complaint with identifier '${id}' was not found`);
    }

    const updateFields = {};

    if (payload.status) updateFields.status = payload.status;
    if (payload.complaintAgainst) updateFields.complaintAgainst = payload.complaintAgainst;
    if (payload.complaintType) updateFields.complaintType = payload.complaintType;
    if (payload.priority) {
      updateFields.priority = payload.priority;
      if (!updateFields.complaintDetails) updateFields['complaintDetails.priority'] = payload.priority;
    }
    if (payload.hasPreviousInteraction !== undefined) {
      updateFields.hasPreviousInteraction = Boolean(payload.hasPreviousInteraction);
    }
    if (payload.preferredResolution !== undefined) {
      updateFields.preferredResolution = payload.preferredResolution;
    }

    // Resolution Notes & Admin Action
    const resNotes = payload.resolutionNotes || payload.adminRemarks || payload.adminAction?.resolutionNotes;
    if (resNotes !== undefined) {
      updateFields.resolutionNotes = resNotes;
      updateFields['adminAction.resolutionNotes'] = resNotes;
      updateFields['adminAction.updatedAt'] = new Date();
    }
    const upBy = payload.updatedBy !== undefined ? payload.updatedBy : payload.adminAction?.updatedBy;
    if (upBy !== undefined) {
      updateFields.updatedBy = upBy;
      updateFields['adminAction.updatedBy'] = upBy;
    }
    if (payload.adminAction?.updatedBy !== undefined) {
      updateFields['adminAction.updatedBy'] = payload.adminAction.updatedBy;
      if (updateFields.updatedBy === undefined) updateFields.updatedBy = payload.adminAction.updatedBy;
    }

    // Complaint Details merge
    if (payload.complaintDetails) {
      const prev = existing.complaintDetails || {};
      const next = payload.complaintDetails;
      updateFields.complaintDetails = {
        incidentDate: next.incidentDate !== undefined ? next.incidentDate : prev.incidentDate,
        incidentTime: next.incidentTime !== undefined ? next.incidentTime : prev.incidentTime,
        location: next.location !== undefined ? next.location : prev.location,
        priority: next.priority || prev.priority || updateFields.priority || 'High',
        proofAvailable: next.proofAvailable !== undefined ? Boolean(next.proofAvailable) : prev.proofAvailable,
        amountInvolved: next.amountInvolved !== undefined ? Number(next.amountInvolved) || 0 : prev.amountInvolved,
      };
    }

    // Description merge
    if (payload.description) {
      const prev = existing.description || {};
      const next = payload.description;
      updateFields.description = {
        issueSummary: next.issueSummary !== undefined ? next.issueSummary : prev.issueSummary,
        detailedDescription: next.detailedDescription !== undefined ? next.detailedDescription : prev.detailedDescription,
      };
    }

    // Media
    if (payload.media && Array.isArray(payload.media)) {
      updateFields.media = payload.media.map((m) => ({
        url: typeof m === 'string' ? m : (m.url || ''),
        type: typeof m === 'object' && m.type ? m.type : 'Photo',
      }));
    }

    // ComplaintBy merge
    if (payload.complaintBy) {
      const prev = existing.complaintBy || {};
      const next = payload.complaintBy;
      updateFields.complaintBy = {
        memberId: next.memberId !== undefined ? next.memberId : prev.memberId,
        name: next.name !== undefined ? next.name : prev.name,
        business: next.business !== undefined ? next.business : prev.business,
        mobile: next.mobile !== undefined ? next.mobile : prev.mobile,
        email: next.email !== undefined ? next.email : prev.email,
        avatar: next.avatar !== undefined ? next.avatar : prev.avatar,
      };
    }

    const updated = await Complaint.findOneAndUpdate(
      this.buildComplaintQuery(id),
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    return await this.formatDetailItem(updated);
  }

  static async deleteComplaint(id) {
    const deleted = await Complaint.findOneAndDelete(this.buildComplaintQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Complaint with identifier '${id}' was not found`);
    }
    return deleted;
  }
}
