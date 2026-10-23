import { Post } from '../models/Post.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export function detectMediaType(media = '', fallback = 'Photo') {
  if (!media || typeof media !== 'string') return fallback;
  const clean = media.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) {
    return 'Notice';
  }
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.avi') ||
    clean.endsWith('.mkv') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.3gp') ||
    clean.endsWith('.m4v')
  ) {
    return 'Video';
  }
  return 'Photo';
}

export function normalizeMediaPath(media = '') {
  if (!media || typeof media !== 'string') return '';
  if (
    media.startsWith('http://') ||
    media.startsWith('https://') ||
    media.startsWith('/uploads/') ||
    media.startsWith('/images/')
  ) {
    return media;
  }
  return `/uploads/${media.replace(/^\/+/, '')}`;
}

export class PostService {
  static async getPosts({ search = '', mediaType = '', location = '', isPinned, page = 1, limit = 15 } = {}) {
    const filter = {};

    if (mediaType && mediaType !== 'all' && mediaType !== 'All') {
      filter.mediaType = new RegExp(`^${mediaType}$`, 'i');
    }

    if (location && location !== 'all' && location !== 'All') {
      filter.location = new RegExp(location.trim(), 'i');
    }

    if (isPinned !== undefined && isPinned !== '' && isPinned !== 'all') {
      filter.isPinned = String(isPinned).toLowerCase() === 'true';
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: reg },
        { description: reg },
        { location: reg },
        { mediaType: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 15);

    const [items, total] = await Promise.all([
      Post.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
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
    const media = normalizeMediaPath(data.media || '');
    const mediaType = data.mediaType || detectMediaType(media);

    const newPost = await Post.create({
      id,
      title: data.title,
      description: data.description || '',
      media,
      mediaType,
      location: data.location || 'Ahmedabad',
      allowComments: data.allowComments !== undefined ? Boolean(data.allowComments) : true,
      isPinned: data.isPinned !== undefined ? Boolean(data.isPinned) : false,
    });
    return newPost;
  }

  static async updatePost(id, updates) {
    const allowed = ['title', 'description', 'media', 'mediaType', 'location', 'allowComments', 'isPinned'];
    const filtered = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        filtered[key] = updates[key];
      }
    }

    if (filtered.media) {
      filtered.media = normalizeMediaPath(filtered.media);
      if (!filtered.mediaType) {
        filtered.mediaType = detectMediaType(filtered.media);
      }
    }

    const updated = await Post.findOneAndUpdate(buildIdQuery(id), filtered, { returnDocument: 'after' });
    if (!updated) {
      throw ApiError.notFound(`Post with ID '${id}' was not found`);
    }
    return updated;
  }

  static async deletePost(id) {
    const deleted = await Post.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Post with ID '${id}' was not found`);
    }
    return deleted;
  }
}
