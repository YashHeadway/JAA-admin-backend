import { Broadcast } from '../models/Broadcast.js';
import { Group } from '../models/Group.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

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

export class BroadcastService {
  static async getBroadcasts({ search = '', groupId = '', sentTo = '', page = 1, limit = 20 } = {}) {
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: reg },
        { broadcastTitle: reg },
        { message: reg },
        { sendTo: reg },
        { sentTo: reg },
      ];
    }

    if (groupId) {
      const gNum = Number(groupId);
      filter.groupId = !isNaN(gNum) ? { $in: [gNum, String(groupId)] } : groupId;
    }

    if (sentTo && sentTo.trim() && sentTo.toLowerCase() !== 'all') {
      const regAudience = new RegExp(`^${sentTo.trim()}$`, 'i');
      filter.$or = [{ sendTo: regAudience }, { sentTo: regAudience }];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 20);

    const [items, total] = await Promise.all([
      Broadcast.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Broadcast.countDocuments(filter),
    ]);

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
    };
  }

  static async getBroadcastById(id) {
    const broadcast = await Broadcast.findOne(buildIdQuery(id));
    if (!broadcast) {
      throw ApiError.notFound(`Broadcast with ID '${id}' was not found`);
    }
    return broadcast;
  }

  static async createBroadcast(data, file = null) {
    const title = (
      data.title ||
      data.broadcastTitle ||
      data['Broadcast Title'] ||
      data['broadcast_title'] ||
      data['Title'] ||
      ''
    ).trim();
    if (!title) {
      throw ApiError.badRequest('Broadcast title is required');
    }

    const message = (data.message || data.Message || '').trim();
    if (!message) {
      throw ApiError.badRequest('Message is required');
    }

    const id = await getNextSequence('broadcasts');
    const sentOn = data.sentOn || formatBroadcastSentOn(new Date());

    let sentTo = (
      data.sentTo ||
      data.sendTo ||
      data['Send To'] ||
      data['send_to'] ||
      data['send to'] ||
      'All Members'
    ).trim();

    // Normalize audience option matching Image 1
    if (/^all(\s*members?)?$/i.test(sentTo)) {
      sentTo = 'All Members';
    } else if (/^comm?itt?ee(\s*members?)?$/i.test(sentTo)) {
      sentTo = 'Committee Members';
    }

    let rawGroupInput = data.group_id !== undefined ? data.group_id : (data.groupId !== undefined ? data.groupId : (data['Group ID'] || null));
    if (typeof rawGroupInput === 'string' && rawGroupInput.trim().startsWith('{')) {
      try { rawGroupInput = JSON.parse(rawGroupInput); } catch {}
    }

    let rawGroupId =
      rawGroupInput !== undefined && rawGroupInput !== null
        ? (typeof rawGroupInput === 'object' ? (rawGroupInput.id || rawGroupInput._id) : rawGroupInput)
        : null;

    let groupName =
      data.groupName ||
      data.group_name ||
      (typeof rawGroupInput === 'object' && rawGroupInput !== null ? (rawGroupInput.name || rawGroupInput.groupName) : null);

    // If groupId is provided, verify group and default sentTo to group's name if needed
    let group = null;
    if (rawGroupId) {
      group = await Group.findOne(buildIdQuery(rawGroupId));
      if (group) {
        rawGroupId = group.id;
        groupName = group.name || group.groupName;
        if (!sentTo || sentTo === 'All Members') {
          sentTo = group.name;
        }
      }
    } else if (sentTo && sentTo !== 'All Members' && sentTo !== 'Committee Members') {
      group = await Group.findOne({
        $or: [{ name: sentTo }, { groupName: sentTo }],
      });
      if (group) {
        rawGroupId = group.id;
        groupName = group.name || group.groupName;
      }
    }

    const groupInfo = rawGroupId
      ? {
          id: Number(rawGroupId) || rawGroupId,
          name: groupName || (group ? (group.name || group.groupName) : (sentTo || `Group ${rawGroupId}`)),
        }
      : null;

    const attachment = file ? `/uploads/${file.filename}` : (data.attachment || data.Attachment || data.file || null);

    const broadcast = await Broadcast.create({
      id,
      title,
      broadcastTitle: title,
      message,
      attachment,
      sentOn,
      sentTo,
      sendTo: sentTo,
      status: data.status || 'Delivered',
      groupId: rawGroupId,
      group_id: groupInfo,
      groupName: groupName || (groupInfo ? groupInfo.name : null),
      createdBy: data.createdBy || data['Created By'] || 'Admin User',
    });

    const broadcastItem = {
      id: broadcast.id,
      title: broadcast.title || broadcast.broadcastTitle || '',
      broadcastTitle: broadcast.broadcastTitle || broadcast.title || '',
      message: broadcast.message || '',
      sentOn: broadcast.sentOn || '',
      sendTo: broadcast.sendTo || broadcast.sentTo || 'All Members',
      group_id: groupInfo,
      status: broadcast.status || 'Delivered',
      attachment: broadcast.attachment || null,
    };

    // Update group recent broadcasts if targeted to a group, all groups, or matching group name
    if (group) {
      await Group.findOneAndUpdate(buildIdQuery(group.id), {
        $push: { recentBroadcasts: { $each: [broadcastItem], $position: 0, $slice: 20 } },
      });
    } else if (sentTo === 'All Members') {
      await Group.updateMany({}, {
        $push: { recentBroadcasts: { $each: [broadcastItem], $position: 0, $slice: 20 } },
      });
    } else {
      const matchedGroup = await Group.findOne({
        $or: [{ name: sentTo }, { groupName: sentTo }],
      });
      if (matchedGroup) {
        await Group.findOneAndUpdate(buildIdQuery(matchedGroup.id), {
          $push: { recentBroadcasts: { $each: [broadcastItem], $position: 0, $slice: 20 } },
        });
      }
    }

    return broadcast;
  }

  static async deleteBroadcast(id) {
    const deleted = await Broadcast.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Broadcast with ID '${id}' was not found`);
    }

    // Also remove from groups' recentBroadcasts
    try {
      await Group.updateMany(
        { 'recentBroadcasts.id': deleted.id },
        { $pull: { recentBroadcasts: { id: deleted.id } } }
      );
    } catch {
      // ignore
    }

    return deleted;
  }
}
