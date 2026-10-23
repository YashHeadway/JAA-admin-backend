import { Broadcast } from '../models/Broadcast.js';
import { Group } from '../models/Group.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class BroadcastService {
  static async getBroadcasts({ search = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: reg }, { message: reg }];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

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

  static async createBroadcast(data) {
    const id = await getNextSequence('broadcasts');
    const now = new Date();
    const sentOn = `${now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const broadcast = await Broadcast.create({
      id,
      title: data.title,
      message: data.message,
      sentOn,
      sentTo: data.sentTo || 'All Members',
      status: 'Delivered',
      groupId: data.groupId || null,
    });

    if (data.groupId) {
      await Group.findOneAndUpdate(buildIdQuery(data.groupId), {
        $push: { recentBroadcasts: { $each: [broadcast], $position: 0, $slice: 10 } },
      });
    }

    return broadcast;
  }
}
