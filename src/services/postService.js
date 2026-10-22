import { Post } from '../models/Post.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class PostService {
  static async getPosts({ search = '', tab = 'All', type = '', dateRange = '', page = 1, limit = 15 } = {}) {
    const filter = {};

    // Tab filter
    if (tab && tab !== 'All') {
      if (tab === 'JAA') {
        filter.$or = [{ category: 'JAA' }, { postedBy: /JAA/i }, { id: 1 }, { id: 2 }];
      } else if (tab === 'Photos') {
        filter.type = 'Photo';
      } else if (tab === 'Videos') {
        filter.type = 'Video';
      } else if (tab === 'Notices') {
        filter.type = 'Notice';
      } else if (tab === 'Events') {
        filter.category = 'Events';
      }
    }

    // Type filter
    if (type && type !== 'All Types') {
      filter.type = { $regex: new RegExp(`^${type}$`, 'i') };
    }

    // Date range filter
    if (dateRange && dateRange.trim()) {
      filter.date = { $regex: new RegExp(dateRange.trim(), 'i') };
    }

    // Search filter
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: reg },
        { subtitle: reg },
        { postedBy: reg },
        { authorEmail: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Post.find(filter).sort({ id: 1 }).skip(skip).limit(parsedLimit),
      Post.countDocuments(filter),
    ]);

    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: items,
      pagination,
    };
  }

  static async getPostById(id) {
    const post = await Post.findOne(buildIdQuery(id));
    if (!post) {
      throw ApiError.notFound(`Post with ID '${id}' was not found`);
    }
    return post;
  }

  static async createPost(data) {
    const id = await getNextSequence('posts');
    const newPost = await Post.create({
      id,
      subtitle: data.subtitle || (data.description ? data.description.slice(0, 60) + '...' : 'New announcement'),
      type: data.type || 'Photo',
      category: data.category || (data.type === 'Video' ? 'Videos' : data.type === 'Notice' ? 'Notices' : 'Photos'),
      postedBy: data.postedBy || 'Harvey Specter',
      authorEmail: data.authorEmail || 'harveyspecter@gmail.com',
      authorAvatar: data.authorAvatar || '/images/members/harvey-specter.jpg',
      postThumbnail: data.postThumbnail || (data.type === 'Notice' ? null : '/images/posts/preview-dashboard.jpg'),
      mainMedia: data.mainMedia || '/images/posts/preview-dashboard.jpg',
      date: '24 May 2026',
      status: data.status || 'Published',
      ...data,
    });
    return newPost;
  }

  static async deletePost(id) {
    const deleted = await Post.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Post with ID '${id}' was not found`);
    }
    return deleted;
  }
}
