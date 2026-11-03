import { Group } from '../models/Group.js';
import { Broadcast } from '../models/Broadcast.js';
import { Member } from '../models/Member.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';
import { formatDateTime } from '../utils/dateFormatter.js';
import mongoose from 'mongoose';
import xlsx from 'xlsx';

/**
 * Format date like "12 December 2025" as shown in Group Details UI
 */
const formatGroupCreatedOn = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '12 December 2025';
  const day = d.getDate();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Format sentOn like "15 May 2026, 10:30AM"
 */
const formatBroadcastSentOn = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year}, ${hours}:${minutes}${ampm}`;
};

export class GroupService {
  /**
   * Helper to parse members from an uploaded Excel / CSV file
   */
  static async parseMembersFromFile(file) {
    if (!file || !file.path) return [];
    try {
      const reader = typeof xlsx?.readFile === 'function' ? xlsx.readFile : xlsx?.default?.readFile;
      const utils = xlsx?.utils || xlsx?.default?.utils;
      if (!reader || !utils) return [];
      const workbook = reader(file.path);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return [];
      const worksheet = workbook.Sheets[sheetName];
      const rows = utils.sheet_to_json(worksheet, { defval: '' });
      if (!Array.isArray(rows) || rows.length === 0) return [];

      const rawItems = [];
      for (const row of rows) {
        const idVal = row.id || row.Id || row.ID || row['Member ID'] || row['memberId'] || row['member_id'];
        const mobileVal = row.mobile || row.Mobile || row.phone || row.Phone || row['Mobile Number'] || row['Phone Number'];
        const nameVal = row.name || row.Name || row['Full Name'] || row['Member Name'];
        const emailVal = row.email || row.Email || row['Email Address'];
        const businessVal = row.business || row.Business || row['Company'] || row['Firm Name'];
        const membershipVal = row.membershipId || row['Membership ID'] || row['MembershipId'];

        if (idVal !== undefined && idVal !== '') {
          rawItems.push(idVal);
        } else if (nameVal || mobileVal || emailVal) {
          rawItems.push({
            name: String(nameVal || '').trim(),
            mobile: String(mobileVal || '').trim(),
            email: String(emailVal || '').trim(),
            business: String(businessVal || '').trim(),
            membershipId: String(membershipVal || '').trim(),
          });
        }
      }
      return rawItems;
    } catch (err) {
      console.error('Error parsing Excel file for group members:', err);
      return [];
    }
  }

  /**
   * Helper to resolve members array from IDs, mobiles, emails or objects
   */
  static async resolveMembers(membersInput) {
    if (!membersInput) return [];
    let list = membersInput;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch {
        list = list.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(list)) return [];

    const memberIds = [];
    const objectIds = [];
    const mobiles = [];
    const emails = [];
    const directObjects = [];

    for (const item of list) {
      if (item && typeof item === 'object') {
        const id = item.id !== undefined ? item.id : item.memberId;
        if (item.name && (item.mobile || item.email)) {
          directObjects.push({
            id: id || item._id,
            memberId: id || item._id,
            name: item.name || '',
            mobile: item.mobile || '',
            email: item.email || '',
            avatar: item.avatar || null,
            business: item.business || '',
            membershipId: item.membershipId || '',
          });
        } else if (id) {
          memberIds.push(id);
        } else if (item.mobile) {
          mobiles.push(String(item.mobile).trim());
        } else if (item.email) {
          emails.push(String(item.email).trim().toLowerCase());
        }
      } else if (item !== undefined && item !== null && String(item).trim() !== '') {
        const str = String(item).trim();
        const num = Number(str);
        if (!isNaN(num)) {
          memberIds.push(num);
        } else if (mongoose.Types.ObjectId.isValid(str)) {
          objectIds.push(new mongoose.Types.ObjectId(str));
        } else {
          memberIds.push(str);
        }
      }
    }

    let foundMembers = [];
    const conditions = [];
    if (memberIds.length > 0) {
      conditions.push({ id: { $in: memberIds } });
      conditions.push({ membershipId: { $in: memberIds.map(String) } });
    }
    if (objectIds.length > 0) {
      conditions.push({ _id: { $in: objectIds } });
    }
    if (mobiles.length > 0) {
      conditions.push({ mobile: { $in: mobiles } });
    }
    if (emails.length > 0) {
      conditions.push({ email: { $in: emails } });
    }

    if (conditions.length > 0) {
      foundMembers = await Member.find({ $or: conditions });
    }

    const resolved = [...directObjects];
    const seenIds = new Set(resolved.map((m) => String(m.id || m.memberId)));

    for (const m of foundMembers) {
      const idKey = String(m.id || m._id);
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        resolved.push({
          id: m.id || m._id,
          memberId: m.id || m._id,
          name: m.name || '',
          mobile: m.mobile || '',
          email: m.email || '',
          avatar: m.avatar || null,
          business: m.business || '',
          membershipId: m.membershipId || '',
        });
      }
    }

    // For any IDs requested but not found in Member collection, keep them as basic member items
    for (const rawId of memberIds) {
      const idKey = String(rawId);
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        resolved.push({
          id: rawId,
          memberId: rawId,
          name: `Member ${rawId}`,
          mobile: '',
          email: '',
          avatar: null,
          business: '',
          membershipId: '',
        });
      }
    }

    return resolved;
  }

  static async getGroups({ search = '', groupType = '', status = '', page = 1, limit = 20 } = {}) {
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: reg },
        { groupName: reg },
        { about: reg },
        { description: reg },
        { createdBy: reg },
        { groupType: reg },
      ];
    }

    if (groupType && groupType.trim()) {
      filter.groupType = new RegExp(`^${groupType.trim()}$`, 'i');
    }

    if (status !== '' && status !== undefined && status !== 'all' && status !== 'ALL') {
      if (status === true || status === 'true' || status === 'active' || status === 'ACTIVE') {
        filter.status = true;
      } else if (status === false || status === 'false' || status === 'inactive' || status === 'INACTIVE') {
        filter.status = false;
      }
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 20);

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

  /**
   * Helper to fetch real-time recent broadcasts for a group
   */
  static async getGroupRecentBroadcasts(group) {
    if (!group) return [];
    try {
      const gIdNum = Number(group.id);
      const orConditions = [
        { sentTo: 'All Members' },
        { sendTo: 'All Members' },
      ];

      if (group.name) {
        orConditions.push({ sentTo: group.name });
        orConditions.push({ sendTo: group.name });
      }
      if (group.groupName && group.groupName !== group.name) {
        orConditions.push({ sentTo: group.groupName });
        orConditions.push({ sendTo: group.groupName });
      }
      if (group.id !== undefined && group.id !== null) {
        orConditions.push({ groupId: group.id });
        orConditions.push({ groupId: String(group.id) });
        if (!isNaN(gIdNum)) {
          orConditions.push({ groupId: gIdNum });
        }
      }

      const broadcasts = await Broadcast.find({ $or: orConditions })
        .sort({ id: -1 })
        .limit(10);

      if (broadcasts && broadcasts.length > 0) {
        return broadcasts.map((b) => {
          const rawGId = b.groupId !== undefined && b.groupId !== null ? (typeof b.groupId === 'object' ? b.groupId.id : b.groupId) : (group.id || null);
          const rawGName = b.groupName || (b.groupId && typeof b.groupId === 'object' ? (b.groupId.name || b.groupId.groupName) : (group.name || group.groupName || ''));
          const groupObj = rawGId !== null && rawGId !== undefined ? { id: Number(rawGId) || rawGId, name: rawGName } : null;

          return {
            id: b.id,
            title: b.title || b.broadcastTitle || '',
            broadcastTitle: b.title || b.broadcastTitle || '',
            message: b.message || '',
            sentOn: b.sentOn || (b.createdAt ? formatDateTime(b.createdAt) : ''),
            sendTo: b.sendTo || b.sentTo || group.name || 'All Members',
            group_id: groupObj,
            status: b.status || 'Delivered',
            attachment: b.attachment || null,
          };
        });
      }
    } catch (err) {
      console.error('Error fetching recent broadcasts for group:', err);
    }
    return group.recentBroadcasts || [];
  }

  static async getGroupById(id) {
    const group = await Group.findOne(buildIdQuery(id));
    if (!group) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }

    return group;
  }

  static async getMembersForSelect({ search = '', page = 1, limit = 100 } = {}) {
    const filter = {};
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: reg },
        { business: reg },
        { mobile: reg },
        { email: reg },
        { membershipId: reg },
        { city: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 100);

    const [members, total] = await Promise.all([
      Member.find(filter).sort({ id: 1 }).skip(skip).limit(parsedLimit),
      Member.countDocuments(filter),
    ]);

    const formatted = members.map((m) => ({
      id: m.id || m._id,
      memberId: m.id || m._id,
      membershipId: m.membershipId || (m.id ? `JBAD${150 + m.id}` : ''),
      name: m.name || '',
      business: m.business || '',
      mobile: m.mobile || '',
      email: m.email || '',
      avatar: m.avatar || null,
      city: m.city || '',
      status: m.status || 'approved',
    }));

    return {
      data: formatted,
      pagination: formatPaginationMeta(total, parsedPage, parsedLimit),
    };
  }

  static async createGroup(data, file = null) {
    const id = await getNextSequence('groups');
    const name = (
      data.name ||
      data.groupName ||
      data['Group Name'] ||
      data['group_name'] ||
      data.title ||
      ''
    ).trim();
    if (!name) {
      throw ApiError.badRequest('Group name is required');
    }

    const description = (
      data.description ||
      data.about ||
      data['Description'] ||
      data['Description (Optional)'] ||
      data['about_group'] ||
      ''
    ).trim();
    const groupType = (data.groupType || data['Group Type'] || 'All Members').trim();
    const createdBy = (data.createdBy || data['Created By'] || 'Admin User').trim();
    const status = data.status !== undefined ? Boolean(data.status === true || data.status === 'true' || data.status === 1) : true;
    const createdOn = data.createdOn ? formatGroupCreatedOn(data.createdOn) : formatGroupCreatedOn(new Date());

    // Members resolution from JSON fields or Excel upload
    let rawMembers =
      data.members ||
      data.memberIds ||
      data.addMembers ||
      data['Add Members'] ||
      data['members[]'] ||
      data['memberIds[]'] ||
      data['addMembers[]'] ||
      [];

    // Parse Excel or CSV file if uploaded
    if (file) {
      const fileMembers = await this.parseMembersFromFile(file);
      if (fileMembers.length > 0) {
        if (typeof rawMembers === 'string') {
          try {
            rawMembers = JSON.parse(rawMembers);
          } catch {
            rawMembers = rawMembers.split(',').map((s) => s.trim()).filter(Boolean);
          }
        }
        rawMembers = [...(Array.isArray(rawMembers) ? rawMembers : []), ...fileMembers];
      }
    }

    const members = await this.resolveMembers(rawMembers);
    const memberCount = members.length > 0 ? members.length : Number(data.memberCount || 0);

    const excelFile = file ? `/uploads/${file.filename}` : (data.excelFile || data.file || null);

    const newGroup = await Group.create({
      id,
      name,
      groupName: name,
      about: description,
      description,
      memberCount,
      groupType,
      createdOn,
      createdBy,
      status,
      excelFile,
      members,
      recentBroadcasts: Array.isArray(data.recentBroadcasts) ? data.recentBroadcasts : [],
    });

    return newGroup;
  }

  static async updateGroup(id, updates, file = null) {
    const existing = await Group.findOne(buildIdQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }

    const updateFields = {};

    if (updates.name !== undefined || updates.groupName !== undefined || updates['Group Name'] !== undefined) {
      const name = (updates.name || updates.groupName || updates['Group Name'] || '').trim();
      updateFields.name = name;
      updateFields.groupName = name;
    }

    if (updates.description !== undefined || updates.about !== undefined || updates['Description'] !== undefined) {
      const desc = (
        updates.description !== undefined
          ? updates.description
          : (updates.about !== undefined ? updates.about : updates['Description'])
      ).trim();
      updateFields.description = desc;
      updateFields.about = desc;
    }

    if (updates.groupType !== undefined) {
      updateFields.groupType = String(updates.groupType).trim();
    }

    if (updates.createdBy !== undefined) {
      updateFields.createdBy = String(updates.createdBy).trim();
    }

    if (updates.status !== undefined) {
      updateFields.status = Boolean(updates.status === true || updates.status === 'true' || updates.status === 1);
    }

    if (file) {
      updateFields.excelFile = `/uploads/${file.filename}`;
    }

    const hasMembersUpdate =
      updates.members !== undefined ||
      updates.memberIds !== undefined ||
      updates.addMembers !== undefined ||
      updates['Add Members'] !== undefined ||
      file;

    if (hasMembersUpdate) {
      let raw =
        updates.members !== undefined
          ? updates.members
          : (updates.memberIds !== undefined ? updates.memberIds : (updates.addMembers || updates['Add Members']));

      if (file) {
        const fileMembers = await this.parseMembersFromFile(file);
        if (fileMembers.length > 0) {
          if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch { raw = raw.split(',').map((s) => s.trim()).filter(Boolean); }
          }
          raw = [...(Array.isArray(raw) ? raw : []), ...fileMembers];
        }
      }

      const resolved = await this.resolveMembers(raw);
      updateFields.members = resolved;
      updateFields.memberCount = resolved.length;
    } else if (updates.memberCount !== undefined) {
      updateFields.memberCount = Number(updates.memberCount) || 0;
    }

    const updated = await Group.findOneAndUpdate(buildIdQuery(id), { $set: updateFields }, { returnDocument: 'after' });
    return updated;
  }

  static async addMembers(id, memberInput, file = null) {
    const existing = await Group.findOne(buildIdQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }

    let rawMembers = memberInput || [];
    if (rawMembers && typeof rawMembers === 'object' && !Array.isArray(rawMembers)) {
      rawMembers =
        rawMembers.members ||
        rawMembers.memberIds ||
        rawMembers.addMembers ||
        rawMembers['Add Members'] ||
        rawMembers['memberIds[]'] ||
        rawMembers['members[]'] ||
        rawMembers['addMembers[]'] ||
        [];
    }

    if (file) {
      const fileMembers = await this.parseMembersFromFile(file);
      if (fileMembers.length > 0) {
        if (typeof rawMembers === 'string') {
          try { rawMembers = JSON.parse(rawMembers); } catch { rawMembers = rawMembers.split(',').map((s) => s.trim()).filter(Boolean); }
        }
        rawMembers = [...(Array.isArray(rawMembers) ? rawMembers : []), ...fileMembers];
      }
    }

    const newMembers = await this.resolveMembers(rawMembers);
    const current = existing.members || [];
    const seen = new Set(current.map((m) => String(m.id || m.memberId)));

    for (const m of newMembers) {
      const key = String(m.id || m.memberId);
      if (!seen.has(key)) {
        seen.add(key);
        current.push(m);
      }
    }

    existing.members = current;
    existing.memberCount = current.length;
    if (file) {
      existing.excelFile = `/uploads/${file.filename}`;
    }

    await existing.save();
    return existing;
  }

  static async removeMember(id, memberId) {
    const existing = await Group.findOne(buildIdQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Group with ID '${id}' was not found`);
    }

    const targetIdStr = String(memberId).trim();
    existing.members = (existing.members || []).filter((m) => String(m.id) !== targetIdStr && String(m.memberId) !== targetIdStr);
    existing.memberCount = existing.members.length;

    await existing.save();
    return existing;
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
