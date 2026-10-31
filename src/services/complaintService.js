import mongoose from 'mongoose';
import { Complaint } from '../models/Complaint.js';
import { Member } from '../models/Member.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { formatDateTime } from '../utils/dateFormatter.js';

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
   * Look up member by numeric ID, membership ID, email, name, or ObjectId
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

    const isAgainstMember = String(doc.complaintAgainst || 'Member').toLowerCase() === 'member';

    // 1. Resolve Complainant (complaintBy)
    let memberId = doc.complaintBy?.memberId !== undefined ? doc.complaintBy.memberId : (doc.complainant?.memberId || doc.complainantId || 1);
    let memberObjectId = doc.complaintBy?.memberObjectId || doc.complaintBy?._id || null;
    let name = doc.complaintBy?.name || doc.complainant?.name || '';
    let business = doc.complaintBy?.business || doc.complainant?.business || '';
    let avatar = doc.complaintBy?.avatar || doc.complainant?.avatar || null;
    let membershipId = doc.complaintBy?.membershipId || '';

    if ((!name || !memberObjectId) && (memberId || memberObjectId)) {
      const found = await this.findMember(memberObjectId || memberId);
      if (found) {
        memberObjectId = found._id.toString();
        memberId = found.id;
        membershipId = found.membershipId || '';
        name = found.name;
        business = found.business || '';
        avatar = found.avatar || null;
      }
    }

    const complaintBy = {
      _id: memberObjectId ? memberObjectId.toString() : null,
      memberObjectId: memberObjectId ? memberObjectId.toString() : null,
      memberId: memberId !== null && !isNaN(Number(memberId)) ? Number(memberId) : memberId,
      membershipId,
      name: name || 'Rajesh Mehta',
      business: business || 'Mehta Jewellers',
      avatar: avatar || '/uploads/members/ramesh.jpg',
    };

    // 2. Resolve Target (Option 1: targetMember, Option 2: againstPerson)
    let targetMember = null;
    let againstPerson = null;

    if (isAgainstMember) {
      let tId = doc.targetMember?.memberId || doc.targetMemberId || doc.member?.id || null;
      let tObjectId = doc.targetMember?.memberObjectId || doc.targetMember?._id || doc.targetMemberObjectId || null;
      let tName = doc.targetMember?.name || doc.member?.name || '';
      let tBusiness = doc.targetMember?.business || doc.member?.business || '';
      let tAvatar = doc.targetMember?.avatar || doc.member?.avatar || null;
      let tMembershipId = doc.targetMember?.membershipId || '';

      if ((!tName || !tObjectId) && (tId || tObjectId)) {
        const found = await this.findMember(tObjectId || tId);
        if (found) {
          tObjectId = found._id.toString();
          tId = found.id;
          tMembershipId = found.membershipId || '';
          tName = found.name;
          tBusiness = found.business || '';
          tAvatar = found.avatar || null;
        }
      }

      if (tName || tId || tObjectId) {
        targetMember = {
          _id: tObjectId ? tObjectId.toString() : null,
          memberObjectId: tObjectId ? tObjectId.toString() : null,
          memberId: tId !== null && !isNaN(Number(tId)) ? Number(tId) : tId,
          membershipId: tMembershipId,
          name: tName || 'Yash Soni',
          business: tBusiness || 'Mehta Jewels & Bullion',
          avatar: tAvatar || null,
        };
      }
    } else {
      const p = doc.againstPerson || {};
      againstPerson = {
        name: p.name || doc.member?.name || '',
        mobile: p.mobile || doc.member?.mobile || '',
        email: p.email !== undefined ? p.email : null,
        gstNumber: p.gstNumber !== undefined ? p.gstNumber : null,
        address: p.address !== undefined ? p.address : null,
        company: p.company || doc.member?.business || null,
      };
    }

    const priority = doc.complaintDetails?.priority || doc.priority || 'High';
    const status = doc.status || 'Open';
    const updatedBy = doc.updatedBy !== undefined ? doc.updatedBy : (doc.adminAction?.updatedBy !== undefined ? doc.adminAction.updatedBy : null);
    const createdAt = formatDateTime(doc.createdAt);
    const updatedAt = formatDateTime(doc.updatedAt || doc.createdAt);

    return {
      complaintId,
      id: complaintId,
      complaintNumber: doc.complaintNumber || `CMP-2026-${String(complaintId).padStart(3, '0')}`,
      complaintAgainst: isAgainstMember ? 'Member' : 'Other',
      complaintBy,
      targetMember,
      againstPerson,
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

    const isAgainstMember = String(doc.complaintAgainst || 'Member').toLowerCase() === 'member';

    // 1. Resolve Complainant (complaintBy)
    let memberId = doc.complaintBy?.memberId !== undefined ? doc.complaintBy.memberId : (doc.complainant?.memberId || doc.complainantId || 1);
    let memberObjectId = doc.complaintBy?.memberObjectId || doc.complaintBy?._id || null;
    let name = doc.complaintBy?.name || doc.complainant?.name || '';
    let business = doc.complaintBy?.business || doc.complainant?.business || '';
    let mobile = doc.complaintBy?.mobile || doc.complainant?.mobile || '';
    let email = doc.complaintBy?.email || doc.complainant?.email || '';
    let city = doc.complaintBy?.city || 'Ahmedabad';
    let address = doc.complaintBy?.address || '';
    let avatar = doc.complaintBy?.avatar || doc.complainant?.avatar || null;
    let membershipId = doc.complaintBy?.membershipId || '';

    if ((!name || !mobile || !memberObjectId) && (memberId || memberObjectId)) {
      const found = await this.findMember(memberObjectId || memberId);
      if (found) {
        memberObjectId = found._id.toString();
        memberId = found.id;
        membershipId = found.membershipId || '';
        name = name || found.name;
        business = business || found.business || '';
        mobile = mobile || found.mobile || '';
        email = email || found.email || '';
        city = city || found.city || 'Ahmedabad';
        address = address || found.address || '';
        avatar = avatar || found.avatar || null;
      }
    }

    const complaintBy = {
      _id: memberObjectId ? memberObjectId.toString() : null,
      memberObjectId: memberObjectId ? memberObjectId.toString() : null,
      memberId: memberId !== null && !isNaN(Number(memberId)) ? Number(memberId) : memberId,
      membershipId,
      name: name || 'Rajesh Mehta',
      business: business || 'Mehta Jewellers',
      mobile: mobile || '9876501234',
      email: email || 'rajesh@mehtajewellers.com',
      city: city || 'Ahmedabad',
      address: address || 'Manek Chowk, Ahmedabad',
      avatar: avatar || '/uploads/members/ramesh.jpg',
    };

    // 2. Resolve Target (Option 1: targetMember, Option 2: againstPerson)
    let targetMember = null;
    let againstPerson = null;

    if (isAgainstMember) {
      let tId = doc.targetMember?.memberId || doc.targetMemberId || doc.member?.id || null;
      let tObjectId = doc.targetMember?.memberObjectId || doc.targetMember?._id || doc.targetMemberObjectId || null;
      let tName = doc.targetMember?.name || doc.member?.name || '';
      let tBusiness = doc.targetMember?.business || doc.member?.business || '';
      let tMobile = doc.targetMember?.mobile || doc.member?.mobile || '';
      let tEmail = doc.targetMember?.email || doc.member?.email || '';
      let tCity = doc.targetMember?.city || 'Ahmedabad';
      let tAddress = doc.targetMember?.address || doc.member?.address || '';
      let tAvatar = doc.targetMember?.avatar || doc.member?.avatar || null;
      let tMembershipId = doc.targetMember?.membershipId || '';

      if ((!tName || !tObjectId) && (tId || tObjectId)) {
        const found = await this.findMember(tObjectId || tId);
        if (found) {
          tObjectId = found._id.toString();
          tId = found.id;
          tMembershipId = found.membershipId || '';
          tName = tName || found.name;
          tBusiness = tBusiness || found.business || '';
          tMobile = tMobile || found.mobile || '';
          tEmail = tEmail || found.email || '';
          tCity = tCity || found.city || 'Ahmedabad';
          tAddress = tAddress || found.address || '';
          tAvatar = tAvatar || found.avatar || null;
        }
      }

      targetMember = {
        _id: tObjectId ? tObjectId.toString() : null,
        memberObjectId: tObjectId ? tObjectId.toString() : null,
        memberId: tId !== null && !isNaN(Number(tId)) ? Number(tId) : tId,
        membershipId: tMembershipId,
        name: tName || 'Yash Soni',
        business: tBusiness || 'Mehta Jewels & Bullion',
        mobile: tMobile || '9737126164',
        email: tEmail || 'yashsoni3012@gmail.com',
        city: tCity || 'Ahmedabad',
        address: tAddress || 'C 402 Hirabhai tower, Maninagar, Ahmedabad',
        avatar: tAvatar || null,
      };
    } else {
      const p = doc.againstPerson || {};
      againstPerson = {
        name: p.name || doc.member?.name || '',
        mobile: p.mobile || doc.member?.mobile || '',
        email: p.email !== undefined ? p.email : null,
        gstNumber: p.gstNumber !== undefined ? p.gstNumber : null,
        address: p.address !== undefined ? p.address : null,
        company: p.company || doc.member?.business || null,
      };
    }

    // Backwards-compatible member object
    const member = isAgainstMember && targetMember ? {
      id: targetMember.memberId,
      _id: targetMember._id,
      name: targetMember.name,
      business: targetMember.business,
      mobile: targetMember.mobile,
      email: targetMember.email,
      address: targetMember.address,
      avatar: targetMember.avatar,
    } : {
      id: null,
      _id: null,
      name: againstPerson?.name || '',
      business: againstPerson?.company || null,
      mobile: againstPerson?.mobile || '',
      email: againstPerson?.email || null,
      gstNumber: againstPerson?.gstNumber || null,
      address: againstPerson?.address || null,
      avatar: null,
    };

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

    const priority = doc.complaintDetails?.priority || doc.priority || 'High';
    const status = doc.status || 'Open';
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
      id: complaintId,
      complaintNumber: doc.complaintNumber || `CMP-2026-${String(complaintId).padStart(3, '0')}`,
      complaintAgainst: isAgainstMember ? 'Member' : 'Other',
      complaintBy,
      targetMember,
      againstPerson,
      member,
      complaintType: doc.complaintType || doc.type || 'Payment Dispute',
      priority,
      status,
      hasPreviousInteraction: doc.hasPreviousInteraction !== undefined ? Boolean(doc.hasPreviousInteraction) : false,
      preferredResolution: doc.preferredResolution || 'Requesting immediate payment of pending amount.',
      complaintDetails,
      description,
      media,
      updatedBy,
      adminAction,
      resolutionNotes: adminAction.resolutionNotes,
      createdAt,
      updatedAt,
    };
  }

  static async getComplaints({ search = '', status = '', priority = '', page = 1, limit = 20 } = {}) {
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
        { 'targetMember.name': reg },
        { 'targetMember.business': reg },
        { 'againstPerson.name': reg },
        { 'againstPerson.company': reg },
        { 'againstPerson.mobile': reg },
        { 'againstPerson.gstNumber': reg },
        { 'description.issueSummary': reg },
        { 'description.detailedDescription': reg },
        { 'complaintDetails.location': reg },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 20);

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

    // Determine target type: 'Member' or 'Other'
    const rawAgainst = String(data.complaintAgainst || 'Member').trim().toLowerCase();
    const isAgainstMember = rawAgainst !== 'other' && rawAgainst !== 'person' && rawAgainst !== 'non-member';
    const complaintAgainst = isAgainstMember ? 'Member' : 'Other';

    // 1. Resolve Complainant (complaintBy - Registered Member)
    let complainantId =
      data.complaintBy?.memberObjectId ||
      data.complaintBy?.memberId ||
      data.complainantObjectId ||
      data.complainantId ||
      data.complaintBy?.id ||
      1;

    let complainantDoc = await this.findMember(complainantId);
    if (!complainantDoc) {
      complainantDoc = await Member.findOne({}).sort({ id: 1 });
    }

    const complaintBy = {
      _id: complainantDoc ? complainantDoc._id : null,
      memberObjectId: complainantDoc ? complainantDoc._id : null,
      memberId: complainantDoc ? complainantDoc.id : 1,
      membershipId: complainantDoc?.membershipId || '',
      name: data.complaintBy?.name || complainantDoc?.name || 'Rajesh Mehta',
      business: data.complaintBy?.business || complainantDoc?.business || 'Mehta Jewellers',
      mobile: data.complaintBy?.mobile || complainantDoc?.mobile || '9876501234',
      email: data.complaintBy?.email || complainantDoc?.email || 'rajesh@mehtajewellers.com',
      city: data.complaintBy?.city || complainantDoc?.city || 'Ahmedabad',
      address: data.complaintBy?.address || complainantDoc?.address || '',
      avatar: data.complaintBy?.avatar || complainantDoc?.avatar || '/uploads/members/ramesh.jpg',
    };

    // 2. Resolve Target (Option 1 vs Option 2)
    let targetMember = null;
    let targetMemberObjectId = null;
    let targetMemberId = null;
    let againstPerson = null;
    let member = null;

    if (isAgainstMember) {
      // OPTION 1: Member to Member complaint
      const targetQuery =
        data.targetMemberObjectId ||
        data.targetMemberId ||
        data.againstMemberId ||
        data.targetMember?.memberObjectId ||
        data.targetMember?.memberId ||
        data.targetMember?.id ||
        data.memberId ||
        data.member?.id ||
        2;

      let targetDoc = await this.findMember(targetQuery);
      if (!targetDoc) {
        targetDoc = await Member.findOne({ id: { $ne: complaintBy.memberId } });
      }

      if (targetDoc) {
        targetMemberObjectId = targetDoc._id;
        targetMemberId = targetDoc.id;
        targetMember = {
          _id: targetDoc._id,
          memberObjectId: targetDoc._id,
          memberId: targetDoc.id,
          membershipId: targetDoc.membershipId || '',
          name: targetDoc.name,
          business: targetDoc.business || '',
          mobile: targetDoc.mobile || '',
          email: targetDoc.email || '',
          city: targetDoc.city || 'Ahmedabad',
          address: targetDoc.address || '',
          avatar: targetDoc.avatar || null,
        };

        member = {
          id: targetDoc.id,
          _id: targetDoc._id,
          name: targetDoc.name,
          business: targetDoc.business,
          mobile: targetDoc.mobile,
          email: targetDoc.email,
          address: targetDoc.address,
          avatar: targetDoc.avatar,
        };
      }
    } else {
      // OPTION 2: Member to Another Person
      const p = data.againstPerson || data.complaintPerson || data.person || {};
      const personName = (p.name || data.name || '').trim();
      const personMobile = (p.mobile || p.mobileNumber || p.phone || data.mobile || data.mobileNumber || data.phone || '').trim();
      const personEmail = p.email !== undefined ? p.email : (data.email !== undefined ? data.email : null);
      const personGst = p.gstNumber !== undefined ? p.gstNumber : (p.gst !== undefined ? p.gst : (data.gstNumber || data.gst || null));
      const personAddress = p.address !== undefined ? p.address : (data.address !== undefined ? data.address : null);
      const personCompany = p.company !== undefined ? p.company : (p.business || p.firmName || data.company || data.business || null);

      againstPerson = {
        name: personName,
        mobile: personMobile,
        email: personEmail,
        gstNumber: personGst,
        address: personAddress,
        company: personCompany,
      };

      member = {
        id: null,
        _id: null,
        name: personName,
        business: personCompany,
        mobile: personMobile,
        email: personEmail,
        gstNumber: personGst,
        address: personAddress,
        avatar: null,
      };
    }

    // Incident Details
    const rawAmt = data.complaintDetails?.amountInvolved !== undefined
      ? data.complaintDetails.amountInvolved
      : (data.amountInvolved || 0);
    const amountInvolved = typeof rawAmt === 'number' ? rawAmt : Number(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0;
    const priority = data.complaintDetails?.priority || data.priority || 'High';

    const complaintDetails = {
      incidentDate: data.complaintDetails?.incidentDate || data.incidentDate || '',
      incidentTime: data.complaintDetails?.incidentTime || data.incidentTime || '',
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
    }

    const status = data.status || 'Open';
    const resolutionNotes = data.resolutionNotes || data.adminAction?.resolutionNotes || '';
    const updatedBy = data.updatedBy !== undefined ? data.updatedBy : (data.adminAction?.updatedBy || null);

    const newDoc = await Complaint.create({
      id,
      complaintNumber,
      complaintId,
      complaintAgainst,
      complaintBy,
      targetMemberObjectId,
      targetMemberId,
      targetMember,
      againstPerson,
      member,
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
      updateFields['complaintDetails.priority'] = payload.priority;
    }
    if (payload.hasPreviousInteraction !== undefined) {
      updateFields.hasPreviousInteraction = Boolean(payload.hasPreviousInteraction);
    }
    if (payload.preferredResolution !== undefined) {
      updateFields.preferredResolution = payload.preferredResolution;
    }

    // Target member / Against person updates
    if (payload.targetMemberId || payload.targetMemberObjectId) {
      const found = await this.findMember(payload.targetMemberObjectId || payload.targetMemberId);
      if (found) {
        updateFields.targetMemberObjectId = found._id;
        updateFields.targetMemberId = found.id;
        updateFields.targetMember = {
          _id: found._id,
          memberObjectId: found._id,
          memberId: found.id,
          membershipId: found.membershipId || '',
          name: found.name,
          business: found.business || '',
          mobile: found.mobile || '',
          email: found.email || '',
          city: found.city || 'Ahmedabad',
          address: found.address || '',
          avatar: found.avatar || null,
        };
      }
    }

    if (payload.againstPerson) {
      updateFields.againstPerson = {
        name: payload.againstPerson.name || existing.againstPerson?.name || '',
        mobile: payload.againstPerson.mobile || existing.againstPerson?.mobile || '',
        email: payload.againstPerson.email !== undefined ? payload.againstPerson.email : existing.againstPerson?.email,
        gstNumber: payload.againstPerson.gstNumber !== undefined ? payload.againstPerson.gstNumber : existing.againstPerson?.gstNumber,
        address: payload.againstPerson.address !== undefined ? payload.againstPerson.address : existing.againstPerson?.address,
        company: payload.againstPerson.company !== undefined ? payload.againstPerson.company : existing.againstPerson?.company,
      };
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

    const updated = await Complaint.findOneAndUpdate(this.buildComplaintQuery(id), { $set: updateFields }, { returnDocument: 'after' });
    return await this.formatDetailItem(updated);
  }

  static async deleteComplaint(id) {
    const existing = await Complaint.findOne(this.buildComplaintQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Complaint with identifier '${id}' was not found`);
    }
    await Complaint.deleteOne({ _id: existing._id });
    return existing;
  }
}
