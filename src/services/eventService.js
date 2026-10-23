import { Event } from '../models/Event.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class EventService {
  static async getEvents({ search = '', type = '', date = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: reg },
        { address: reg },
        { city: reg },
        { postedBy: reg },
      ];
    }

    if (date && date.trim()) {
      filter.startDate = { $regex: new RegExp(date.trim(), 'i') };
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Event.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Event.countDocuments(filter),
    ]);

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
    };
  }

  static async getEventById(id) {
    const event = await Event.findOne(buildIdQuery(id));
    if (!event) {
      throw ApiError.notFound(`Event with ID '${id}' was not found`);
    }
    return event;
  }

  static async createEvent(data) {
    const id = await getNextSequence('events');
    const newEvent = await Event.create({
      id,
      image: data.image || '/uploads/events/workshop.jpg',
      isActive: data.isActive ?? true,
      ...data,
    });
    return newEvent;
  }

  static async updateEvent(id, updates) {
    const updated = await Event.findOneAndUpdate(buildIdQuery(id), updates, { returnDocument: 'after' });
    if (!updated) {
      throw ApiError.notFound(`Event with ID '${id}' was not found`);
    }
    return updated;
  }

  static async toggleStatus(id) {
    const event = await Event.findOne(buildIdQuery(id));
    if (!event) {
      throw ApiError.notFound(`Event with ID '${id}' was not found`);
    }

    event.isActive = !event.isActive;
    await event.save();
    return event;
  }

  static async deleteEvent(id) {
    const deleted = await Event.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Event with ID '${id}' was not found`);
    }
    return deleted;
  }
}
