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
   * Format a single complaint into the concise listing format for GET /api/complaints & GET /api/admin/complaints.
   */
  static async formatListItem(complaintDoc) {
    const detail = await this.formatDetailItem(complaintDoc);
    if (!detail) return null;

    return {
      id: detail.id,
      complaintNumber: detail.complaintNumber,
      complaintAgainst: detail.complaintAgainst,
      complaintBy: {
        memberId: detail.complaintBy?.memberId ?? null,
        membershipId: detail.complaintBy?.membershipId || '',
        name: detail.complaintBy?.name || '',
        business: detail.complaintBy?.business || '',
      },
      targetMember: detail.targetMember,
      againstPerson: detail.againstPerson,
      complaintType: detail.complaintType,
      priority: detail.priority,
      status: detail.status,
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
    let memberId = doc.complaintBy?.memberId !== undefined && doc.complaintBy.memberId !== null
      ? doc.complaintBy.memberId
      : (doc.complainant?.memberId || doc.complainantId || doc.complaintBy?.id || null);
    let memberObjectId = doc.complaintBy?.memberObjectId || doc.complaintBy?._id || null;
    let name = (doc.complaintBy?.name || doc.complainant?.name || '').trim();
    let business = (doc.complaintBy?.business || doc.complainant?.business || '').trim();
    let mobile = (doc.complaintBy?.mobile || doc.complainant?.mobile || '').trim();
    let email = (doc.complaintBy?.email || doc.complainant?.email || '').trim();
    let city = (doc.complaintBy?.city || '').trim();
    let address = (doc.complaintBy?.address || '').trim();
    let avatar = doc.complaintBy?.avatar || doc.complainant?.avatar || null;
    let membershipId = (doc.complaintBy?.membershipId || '').trim();

    if (memberId || memberObjectId) {
      const found = await this.findMember(memberObjectId || memberId);
      if (found) {
        memberObjectId = memberObjectId || (found._id ? found._id.toString() : null);
        memberId = memberId !== null && memberId !== undefined ? memberId : found.id;
        membershipId = membershipId || found.membershipId || '';
        name = name || found.name || '';
        business = business || found.business || '';
        mobile = mobile || found.mobile || '';
        email = email || found.email || '';
        city = city || found.city || '';
        address = address || found.address || '';
        avatar = avatar || found.avatar || null;
      }
    }

    const complaintBy = {
      memberId: memberId !== null && !isNaN(Number(memberId)) ? Number(memberId) : memberId,
      membershipId,
      name,
      business,
      mobile,
      email,
      city,
      address,
      avatar,
    };

    // 2. Resolve Target (Option 1: targetMember, Option 2: againstPerson)
    let targetMember = null;
    let againstPerson = null;

    if (isAgainstMember) {
      let tId = doc.targetMember?.memberId !== undefined && doc.targetMember?.memberId !== null
        ? doc.targetMember.memberId
        : (doc.targetMemberId !== undefined && doc.targetMemberId !== null ? doc.targetMemberId : (doc.member?.id || null));
      let tObjectId = doc.targetMember?.memberObjectId || doc.targetMember?._id || doc.targetMemberObjectId || null;
      let tName = (doc.targetMember?.name || doc.member?.name || '').trim();
      let tBusiness = (doc.targetMember?.business || doc.member?.business || '').trim();
      let tMobile = (doc.targetMember?.mobile || doc.member?.mobile || '').trim();
      let tEmail = (doc.targetMember?.email || doc.member?.email || '').trim();
      let tCity = (doc.targetMember?.city || '').trim();
      let tAddress = (doc.targetMember?.address || doc.member?.address || '').trim();
      let tAvatar = doc.targetMember?.avatar || doc.member?.avatar || null;
      let tMembershipId = (doc.targetMember?.membershipId || '').trim();

      if (tId || tObjectId || (!tEmail && tName)) {
        const found = await this.findMember(tId || tObjectId || tName);
        if (found) {
          tObjectId = found._id ? found._id.toString() : null;
          tId = found.id;
          tMembershipId = tMembershipId || found.membershipId || '';
          tName = tName || found.name || '';
          tBusiness = tBusiness || found.business || '';
          tMobile = tMobile || found.mobile || '';
          tEmail = tEmail || found.email || '';
          tCity = tCity || found.city || '';
          tAddress = tAddress || found.address || '';
          tAvatar = tAvatar || found.avatar || null;
        } else {
          tObjectId = null;
        }
      }

      if (tName || tId || tObjectId) {
        targetMember = {
          memberId: tId !== null && !isNaN(Number(tId)) ? Number(tId) : tId,
          membershipId: tMembershipId,
          name: tName || (tId ? `Member ${tId}` : ''),
          business: tBusiness,
          mobile: tMobile,
          email: tEmail,
          city: tCity,
          address: tAddress,
          avatar: tAvatar,
        };
      }
    } else {
      const p = doc.againstPerson || doc.complaintPerson || doc.person || {};
      againstPerson = {
        name: (p.name || doc.member?.name || '').trim(),
        mobile: (p.mobile || doc.member?.mobile || '').trim(),
        email: p.email !== undefined ? p.email : null,
        gstNumber: p.gstNumber !== undefined ? p.gstNumber : null,
        address: p.address !== undefined ? p.address : null,
        company: p.company || p.business || doc.member?.business || null,
      };
    }

    // Incident Details
    const rawAmt = doc.complaintDetails?.amountInvolved !== undefined
      ? doc.complaintDetails.amountInvolved
      : (doc.financialAmount !== undefined ? doc.financialAmount : 0);
    const amountInvolved = typeof rawAmt === 'number' ? rawAmt : Number(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0;
    const priority = doc.complaintDetails?.priority || doc.priority || 'High';

    const complaintDetails = {
      incidentDate: doc.complaintDetails?.incidentDate || doc.incidentDate || '',
      incidentTime: doc.complaintDetails?.incidentTime || doc.incidentTime || '',
      location: doc.complaintDetails?.location || doc.incidentLocation || 'Ahmedabad',
      priority,
      proofAvailable: doc.complaintDetails?.proofAvailable !== undefined ? Boolean(doc.complaintDetails.proofAvailable) : false,
      amountInvolved,
    };

    // Description Details
    const description = {
      issueSummary: doc.description?.issueSummary || doc.typeSubtitle || doc.executiveSummary || (typeof doc.description === 'string' ? doc.description : '') || '',
      detailedDescription: doc.description?.detailedDescription || (typeof doc.description === 'string' ? doc.description : '') || '',
    };

    // Media
    let media = [];
    if (Array.isArray(doc.media) && doc.media.length > 0) {
      media = doc.media.map((m) => ({
        url: typeof m === 'string' ? m : (m.url || ''),
        type: typeof m === 'object' && m.type ? m.type : 'Photo',
      }));
    }

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
      id: complaintId,
      complaintNumber: doc.complaintNumber || `CMP-2026-${String(complaintId).padStart(3, '0')}`,
      complaintAgainst: isAgainstMember ? 'Member' : 'Other',
      complaintBy,
      targetMember,
      againstPerson,
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

  static async getComplaints({ search = '', status = '', priority = '', page = 1, limit = 20, complaintAgainst = '' } = {}) {
    const filter = {};

    if (complaintAgainst && complaintAgainst !== 'ALL' && complaintAgainst !== 'All') {
      if (complaintAgainst.toLowerCase() === 'member') {
        filter.complaintAgainst = /^member$/i;
      } else if (complaintAgainst.toLowerCase() === 'other') {
        filter.complaintAgainst = { $ne: 'Member' };
      }
    }

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

    const [items, total] = await Promise.all([
      Complaint.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Complaint.countDocuments(filter),
    ]);

    const formattedList = await Promise.all(items.map((item) => this.formatListItem(item)));
    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
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

  static async updateStatus(id, updateData, files = []) {
    const payload = typeof updateData === 'string' ? { status: updateData } : { ...updateData };

    const existing = await Complaint.findOne(this.buildComplaintQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Complaint with identifier '${id}' was not found`);
    }

    const updateFields = {};

    // 1. Status (case-insensitive normalization)
    if (payload.status !== undefined && payload.status !== null) {
      const rawStatus = String(payload.status).trim();
      const lowerStatus = rawStatus.toLowerCase();
      let normalizedStatus = rawStatus;
      if (lowerStatus === 'open') normalizedStatus = 'Open';
      else if (lowerStatus === 'new') normalizedStatus = 'New';
      else if (['in progress', 'inprogress', 'in_progress', 'in-progress'].includes(lowerStatus)) normalizedStatus = 'In Progress';
      else if (['under review', 'underreview', 'under_review', 'under-review'].includes(lowerStatus)) normalizedStatus = 'Under Review';
      else if (lowerStatus === 'resolved') normalizedStatus = 'Resolved';
      else if (lowerStatus === 'closed') normalizedStatus = 'Closed';

      updateFields.status = normalizedStatus;
    }

    // 2. Complaint Against ('Member' | 'Other')
    let effectiveComplaintAgainst = existing.complaintAgainst || 'Member';
    if (payload.complaintAgainst) {
      const lowerAgainst = String(payload.complaintAgainst).trim().toLowerCase();
      const isOther = ['other', 'person', 'non-member'].includes(lowerAgainst);
      effectiveComplaintAgainst = isOther ? 'Other' : 'Member';
      updateFields.complaintAgainst = effectiveComplaintAgainst;
    } else if (payload.againstPerson || payload.complaintPerson || payload.person) {
      effectiveComplaintAgainst = 'Other';
      updateFields.complaintAgainst = 'Other';
    } else if (
      payload.targetMember !== undefined ||
      payload.targetMemberId !== undefined ||
      payload.targetId !== undefined ||
      payload.target !== undefined ||
      payload.againstMemberId !== undefined ||
      payload.againstMember !== undefined
    ) {
      effectiveComplaintAgainst = 'Member';
      updateFields.complaintAgainst = 'Member';
    }

    // 3. Complaint Type / Title
    const cType = payload.complaintType || payload.type || payload.title || payload.subject;
    if (cType !== undefined && cType !== null && String(cType).trim() !== '') {
      updateFields.complaintType = String(cType).trim();
    }

    // 4. Priority
    let effectivePriority = payload.priority || payload.complaintDetails?.priority;
    if (effectivePriority) {
      const lowerPri = String(effectivePriority).trim().toLowerCase();
      if (lowerPri === 'low') effectivePriority = 'Low';
      else if (['med', 'medium'].includes(lowerPri)) effectivePriority = 'Medium';
      else if (lowerPri === 'high') effectivePriority = 'High';
      updateFields.priority = effectivePriority;
      updateFields['complaintDetails.priority'] = effectivePriority;
    }

    // 5. History & Preferred Resolution
    if (payload.hasPreviousInteraction !== undefined && payload.hasPreviousInteraction !== null) {
      updateFields.hasPreviousInteraction = Boolean(
        payload.hasPreviousInteraction === true ||
        String(payload.hasPreviousInteraction).toLowerCase() === 'true' ||
        payload.hasPreviousInteraction === 1 ||
        payload.hasPreviousInteraction === '1'
      );
    }
    if (payload.preferredResolution !== undefined && payload.preferredResolution !== null) {
      updateFields.preferredResolution = String(payload.preferredResolution).trim();
    }

    // 6. Complaint Details (Incident Date, Time, Location, Proof, Amount)
    let rawDetails = payload.complaintDetails;
    if (typeof rawDetails === 'string') {
      try {
        rawDetails = JSON.parse(rawDetails);
      } catch {
        rawDetails = {};
      }
    }
    rawDetails = rawDetails && typeof rawDetails === 'object' ? rawDetails : {};

    const incidentDate = payload.incidentDate !== undefined
      ? payload.incidentDate
      : (rawDetails.incidentDate !== undefined ? rawDetails.incidentDate : undefined);
    if (incidentDate !== undefined) {
      updateFields['complaintDetails.incidentDate'] = String(incidentDate).trim();
      updateFields.incidentDate = String(incidentDate).trim();
    }

    const incidentTime = payload.incidentTime !== undefined
      ? payload.incidentTime
      : (rawDetails.incidentTime !== undefined ? rawDetails.incidentTime : undefined);
    if (incidentTime !== undefined) {
      updateFields['complaintDetails.incidentTime'] = String(incidentTime).trim();
      updateFields.incidentTime = String(incidentTime).trim();
    }

    const location = payload.location !== undefined
      ? payload.location
      : (payload.incidentLocation !== undefined ? payload.incidentLocation : (rawDetails.location !== undefined ? rawDetails.location : undefined));
    if (location !== undefined) {
      updateFields['complaintDetails.location'] = String(location).trim();
      updateFields.incidentLocation = String(location).trim();
    }

    const proofAvailable = payload.proofAvailable !== undefined
      ? payload.proofAvailable
      : (rawDetails.proofAvailable !== undefined ? rawDetails.proofAvailable : undefined);
    if (proofAvailable !== undefined) {
      updateFields['complaintDetails.proofAvailable'] = Boolean(
        proofAvailable === true || String(proofAvailable).toLowerCase() === 'true' || proofAvailable === 1 || proofAvailable === '1'
      );
    }

    const rawAmt = payload.amountInvolved !== undefined
      ? payload.amountInvolved
      : (payload.financialAmount !== undefined
          ? payload.financialAmount
          : (payload.amount !== undefined ? payload.amount : rawDetails.amountInvolved));
    if (rawAmt !== undefined) {
      const numAmt = typeof rawAmt === 'number' ? rawAmt : (Number(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
      updateFields['complaintDetails.amountInvolved'] = numAmt;
      updateFields.financialAmount = numAmt;
    }

    // 7. Description Details (issueSummary, detailedDescription)
    let rawDesc = payload.description;
    if (typeof rawDesc === 'string') {
      try {
        rawDesc = JSON.parse(rawDesc);
      } catch {
        // keep string
      }
    }
    let issueSummary = payload.issueSummary || payload.summary || payload.typeSubtitle || payload.executiveSummary;
    let detailedDescription = payload.detailedDescription || payload.details;

    if (typeof rawDesc === 'string') {
      if (!detailedDescription) detailedDescription = rawDesc;
      if (!issueSummary) issueSummary = rawDesc;
    } else if (rawDesc && typeof rawDesc === 'object') {
      if (rawDesc.issueSummary !== undefined && !issueSummary) issueSummary = rawDesc.issueSummary;
      if (rawDesc.detailedDescription !== undefined && !detailedDescription) detailedDescription = rawDesc.detailedDescription;
    }

    if (issueSummary !== undefined) {
      updateFields['description.issueSummary'] = String(issueSummary).trim();
      updateFields.typeSubtitle = String(issueSummary).trim();
    }
    if (detailedDescription !== undefined) {
      updateFields['description.detailedDescription'] = String(detailedDescription).trim();
    }

    // 8. Media
    let mediaList = null;
    if (payload.media !== undefined) {
      let rawMedia = payload.media;
      if (typeof rawMedia === 'string') {
        try {
          rawMedia = JSON.parse(rawMedia);
        } catch {
          rawMedia = [{ url: rawMedia, type: 'Photo' }];
        }
      }
      if (Array.isArray(rawMedia)) {
        mediaList = rawMedia.map((m) => {
          if (typeof m === 'string') return { url: m, type: 'Photo' };
          return {
            url: m.url || m.path || '',
            type: m.type || (m.url && m.url.endsWith('.pdf') ? 'Document' : 'Photo'),
          };
        }).filter((m) => Boolean(m.url));
      } else if (rawMedia && typeof rawMedia === 'object') {
        mediaList = [{
          url: rawMedia.url || rawMedia.path || '',
          type: rawMedia.type || 'Photo',
        }].filter((m) => Boolean(m.url));
      }
    }

    if (Array.isArray(files) && files.length > 0) {
      const uploadedMedia = files.map((f) => ({
        url: `/uploads/${f.filename}`,
        type: f.mimetype && f.mimetype.includes('pdf') ? 'Document' : (f.mimetype && f.mimetype.includes('video') ? 'Video' : 'Photo'),
      }));
      mediaList = mediaList ? [...mediaList, ...uploadedMedia] : [...(existing.media || []), ...uploadedMedia];
    }

    if (mediaList !== null) {
      updateFields.media = mediaList;
    }

    // 9. Target Member (When Against Member)
    if (effectiveComplaintAgainst === 'Member') {
      let targetMemberIdentifier = null;
      let targetMemberObject = null;

      if (payload.targetMember !== undefined && payload.targetMember !== null) {
        let tm = payload.targetMember;
        if (typeof tm === 'string') {
          try {
            tm = JSON.parse(tm);
          } catch {
            // plain string
          }
        }
        if (typeof tm === 'object' && tm !== null) {
          targetMemberObject = tm;
          targetMemberIdentifier = tm.memberId !== undefined ? tm.memberId : (tm.id !== undefined ? tm.id : (tm.memberObjectId || tm._id || tm.name || null));
        } else if (typeof tm === 'number' || (typeof tm === 'string' && tm.trim() !== '')) {
          targetMemberIdentifier = tm;
        }
      }

      if (targetMemberIdentifier === null || targetMemberIdentifier === undefined) {
        targetMemberIdentifier =
          payload.targetId !== undefined ? payload.targetId :
          (payload.targetMemberId !== undefined ? payload.targetMemberId :
          (payload.targetMemberObjectId !== undefined ? payload.targetMemberObjectId :
          (payload.againstMemberId !== undefined ? payload.againstMemberId :
          (payload.target !== undefined ? payload.target :
          (payload.againstMember !== undefined ? payload.againstMember :
          (payload.memberId !== undefined ? payload.memberId :
          (payload.member?.memberId !== undefined ? payload.member.memberId :
          (payload.member?.id !== undefined ? payload.member.id :
          (payload.member?.memberObjectId || payload.member?._id || null)))))))));
      }

      if (!targetMemberObject && payload.member && typeof payload.member === 'object') {
        targetMemberObject = payload.member;
      }

      const cur = existing.targetMember || {};
      const hasMemberUpdates =
        targetMemberIdentifier !== null ||
        targetMemberObject !== null ||
        payload.name !== undefined ||
        payload.business !== undefined ||
        payload.mobile !== undefined ||
        payload.mobileNumber !== undefined ||
        payload.phone !== undefined ||
        payload.email !== undefined ||
        payload.city !== undefined ||
        payload.address !== undefined ||
        payload.avatar !== undefined ||
        payload.membershipId !== undefined;

      if (hasMemberUpdates) {
        let found = null;
        if (targetMemberIdentifier !== null && targetMemberIdentifier !== undefined && String(targetMemberIdentifier).trim() !== '') {
          found = await this.findMember(targetMemberIdentifier);
          if (!found) {
            throw ApiError.notFound(`Target member with identifier '${targetMemberIdentifier}' was not found`);
          }
        }
        if (!found && payload.name && !targetMemberIdentifier) {
          found = await this.findMember(payload.name);
        }

        if (found) {
          updateFields.targetMemberObjectId = found._id;
          updateFields.targetMemberId = found.id;
          updateFields.targetMember = {
            _id: found._id,
            memberObjectId: found._id,
            memberId: found.id,
            membershipId: payload.membershipId || targetMemberObject?.membershipId || found.membershipId || '',
            name: payload.name !== undefined ? payload.name : (targetMemberObject?.name !== undefined ? targetMemberObject.name : found.name),
            business: payload.business !== undefined ? payload.business : (targetMemberObject?.business !== undefined ? targetMemberObject.business : (found.business || '')),
            mobile: (payload.mobile !== undefined ? payload.mobile : (payload.mobileNumber !== undefined ? payload.mobileNumber : (payload.phone !== undefined ? payload.phone : (targetMemberObject?.mobile !== undefined ? targetMemberObject.mobile : (found.mobile || ''))))),
            email: payload.email !== undefined ? payload.email : (targetMemberObject?.email !== undefined ? targetMemberObject.email : (found.email || '')),
            city: payload.city !== undefined ? payload.city : (targetMemberObject?.city !== undefined ? targetMemberObject.city : (found.city || 'Ahmedabad')),
            address: payload.address !== undefined ? payload.address : (targetMemberObject?.address !== undefined ? targetMemberObject.address : (found.address || '')),
            avatar: payload.avatar !== undefined ? payload.avatar : (targetMemberObject?.avatar !== undefined ? targetMemberObject.avatar : (found.avatar || null)),
          };
        } else {
          // Direct field update on existing target member (e.g. name only)
          updateFields.targetMember = {
            _id: cur._id || null,
            memberObjectId: cur.memberObjectId || null,
            memberId: cur.memberId || null,
            membershipId: payload.membershipId || cur.membershipId || '',
            name: payload.name !== undefined ? payload.name : (cur.name || ''),
            business: payload.business !== undefined ? payload.business : (cur.business || ''),
            mobile: (payload.mobile !== undefined ? payload.mobile : (payload.mobileNumber !== undefined ? payload.mobileNumber : (payload.phone !== undefined ? payload.phone : (cur.mobile || '')))),
            email: payload.email !== undefined ? payload.email : (cur.email || ''),
            city: payload.city !== undefined ? payload.city : (cur.city || 'Ahmedabad'),
            address: payload.address !== undefined ? payload.address : (cur.address || ''),
            avatar: payload.avatar !== undefined ? payload.avatar : (cur.avatar || null),
          };
        }
      }
    }

    // 10. Against Person (When Against Other)
    if (effectiveComplaintAgainst === 'Other') {
      let rawPerson = payload.againstPerson || payload.complaintPerson || payload.person;
      if (typeof rawPerson === 'string') {
        try {
          rawPerson = JSON.parse(rawPerson);
        } catch {
          rawPerson = { name: rawPerson };
        }
      }
      const cur = existing.againstPerson || {};
      const hasPersonUpdates =
        rawPerson !== undefined ||
        payload.name !== undefined ||
        payload.mobile !== undefined ||
        payload.mobileNumber !== undefined ||
        payload.phone !== undefined ||
        payload.email !== undefined ||
        payload.gstNumber !== undefined ||
        payload.gst !== undefined ||
        payload.address !== undefined ||
        payload.company !== undefined ||
        payload.business !== undefined ||
        payload.firmName !== undefined;

      if (hasPersonUpdates) {
        updateFields.againstPerson = {
          name: rawPerson?.name !== undefined ? rawPerson.name : (payload.name !== undefined ? payload.name : (cur.name || '')),
          mobile: rawPerson?.mobile !== undefined ? rawPerson.mobile : (payload.mobile !== undefined ? payload.mobile : (payload.mobileNumber || payload.phone || cur.mobile || '')),
          email: rawPerson?.email !== undefined ? rawPerson.email : (payload.email !== undefined ? payload.email : (cur.email || null)),
          gstNumber: rawPerson?.gstNumber !== undefined ? rawPerson.gstNumber : (payload.gstNumber !== undefined ? payload.gstNumber : (payload.gst || cur.gstNumber || null)),
          address: rawPerson?.address !== undefined ? rawPerson.address : (payload.address !== undefined ? payload.address : (cur.address || null)),
          company: rawPerson?.company !== undefined ? rawPerson.company : (payload.company !== undefined ? payload.company : (payload.business || payload.firmName || cur.company || null)),
        };
      }
    }

    // 11. Complainant (complaintBy)
    let complainantId = null;
    let complainantObject = null;

    if (payload.complaintBy !== undefined && payload.complaintBy !== null) {
      let cb = payload.complaintBy;
      if (typeof cb === 'string') {
        try {
          cb = JSON.parse(cb);
        } catch {
          // plain string
        }
      }
      if (typeof cb === 'object' && cb !== null) {
        complainantObject = cb;
        complainantId = cb.memberId !== undefined ? cb.memberId : (cb.id !== undefined ? cb.id : (cb.memberObjectId || cb._id || cb.name || null));
      } else if (typeof cb === 'number' || (typeof cb === 'string' && cb.trim() !== '')) {
        complainantId = cb;
      }
    }

    if (complainantId === null || complainantId === undefined) {
      complainantId =
        payload.complainantId !== undefined ? payload.complainantId :
        (payload.complainantObjectId !== undefined ? payload.complainantObjectId :
        (payload.complainant?.memberId !== undefined ? payload.complainant.memberId :
        (payload.complainant?.id !== undefined ? payload.complainant.id : null)));
    }

    if (!complainantObject && payload.complainant && typeof payload.complainant === 'object') {
      complainantObject = payload.complainant;
    }

    if (complainantId !== null || complainantObject !== null) {
      let found = null;
      if (complainantId !== null && complainantId !== undefined && String(complainantId).trim() !== '') {
        found = await this.findMember(complainantId);
        if (!found) {
          throw ApiError.notFound(`Complainant member with identifier '${complainantId}' was not found`);
        }
      }
      const cur = existing.complaintBy || {};
      if (found) {
        updateFields.complaintBy = {
          _id: found._id,
          memberObjectId: found._id,
          memberId: found.id,
          membershipId: complainantObject?.membershipId || found.membershipId || '',
          name: complainantObject?.name || found.name,
          business: complainantObject?.business || found.business || '',
          mobile: complainantObject?.mobile || found.mobile || '',
          email: complainantObject?.email || found.email || '',
          city: complainantObject?.city || found.city || 'Surat',
          address: complainantObject?.address || found.address || '',
          avatar: complainantObject?.avatar || found.avatar || null,
        };
      } else {
        updateFields.complaintBy = {
          _id: cur._id || null,
          memberObjectId: cur.memberObjectId || null,
          memberId: cur.memberId || null,
          membershipId: complainantObject?.membershipId || cur.membershipId || '',
          name: complainantObject?.name !== undefined ? complainantObject.name : (cur.name || ''),
          business: complainantObject?.business !== undefined ? complainantObject.business : (cur.business || ''),
          mobile: complainantObject?.mobile !== undefined ? complainantObject.mobile : (cur.mobile || ''),
          email: complainantObject?.email !== undefined ? complainantObject.email : (cur.email || ''),
          city: complainantObject?.city !== undefined ? complainantObject.city : (cur.city || 'Surat'),
          address: complainantObject?.address !== undefined ? complainantObject.address : (cur.address || ''),
          avatar: complainantObject?.avatar !== undefined ? complainantObject.avatar : (cur.avatar || null),
        };
      }
    }

    // 12. Resolution Notes & Admin Action
    let rawAdminAction = payload.adminAction;
    if (typeof rawAdminAction === 'string') {
      try {
        rawAdminAction = JSON.parse(rawAdminAction);
      } catch {
        rawAdminAction = {};
      }
    }
    const resNotes = payload.resolutionNotes !== undefined
      ? payload.resolutionNotes
      : (payload.adminRemarks !== undefined
          ? payload.adminRemarks
          : (payload.remarks !== undefined
              ? payload.remarks
              : (payload.notes !== undefined ? payload.notes : rawAdminAction?.resolutionNotes)));
    if (resNotes !== undefined) {
      updateFields.resolutionNotes = resNotes;
      updateFields['adminAction.resolutionNotes'] = resNotes;
      updateFields['adminAction.updatedAt'] = new Date();
    }
    const upBy = payload.updatedBy !== undefined
      ? payload.updatedBy
      : (rawAdminAction?.updatedBy !== undefined ? rawAdminAction.updatedBy : undefined);
    if (upBy !== undefined) {
      updateFields.updatedBy = upBy;
      updateFields['adminAction.updatedBy'] = upBy;
    }

    if (Object.keys(updateFields).length === 0) {
      throw ApiError.badRequest('No valid fields provided for update');
    }

    const updated = await Complaint.findOneAndUpdate(
      this.buildComplaintQuery(id),
      { $set: updateFields },
      { returnDocument: 'after' }
    );
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
