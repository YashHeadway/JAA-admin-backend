import mongoose from 'mongoose';
import { Post } from '../models/Post.js';
import { Member } from '../models/Member.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';
import { formatDateTime, formatDateOnly } from '../utils/dateFormatter.js';

export function getMimeType(filePathOrUrl = '', fallback = 'image/jpeg') {
  if (!filePathOrUrl || typeof filePathOrUrl !== 'string') return fallback;
  const clean = filePathOrUrl.split('?')[0].toLowerCase();
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mov')) return 'video/quicktime';
  if (clean.endsWith('.avi')) return 'video/x-msvideo';
  if (clean.endsWith('.mkv')) return 'video/x-matroska';
  if (clean.endsWith('.3gp')) return 'video/3gpp';
  if (clean.endsWith('.pdf')) return 'application/pdf';
  if (clean.endsWith('.doc')) return 'application/msword';
  if (clean.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return fallback;
}

export function detectMediaType(media = '', fallback = 'Photo') {
  if (!media || typeof media !== 'string') return fallback;
  const clean = media.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf') || clean.includes('pdf') || clean.includes('document')) {
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

export function normalizeMediaArray(rawMedia) {
  let list = rawMedia;
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        list = JSON.parse(trimmed);
      } catch {
        list = [trimmed];
      }
    } else {
      list = [trimmed];
    }
  }

  if (!Array.isArray(list)) {
    if (list && typeof list === 'object') {
      list = [list];
    } else {
      list = [];
    }
  }

  const items = list
    .map((item) => {
      if (typeof item === 'string') {
        const url = normalizeMediaPath(item);
        return {
          url,
          fileType: getMimeType(url),
        };
      }
      if (item && typeof item === 'object') {
        const rawUrl = item.url || item.path || item.media || item.fileUrl || '';
        if (!rawUrl) return null;
        const url = normalizeMediaPath(rawUrl);
        const fileType = item.fileType || item.mimetype || item.type || getMimeType(url);
        return {
          url,
          fileType,
        };
      }
      return null;
    })
    .filter((item) => item && item.url);

  return items.length > 0
    ? items
    : [
        {
          url: 'https://cdn.example.com/posts/event-image.jpg',
          fileType: 'image/jpeg',
        },
      ];
}

export function formatMemberSnapshot(memberDoc, overrides = {}) {
  if (!memberDoc) return null;
  const raw = typeof memberDoc.toObject === 'function' ? memberDoc.toObject() : memberDoc;

  const id = memberDoc.id !== undefined ? memberDoc.id : raw.id;
  const membershipId = memberDoc.membershipId || raw.membershipId || (id ? `JBAD${150 + id}` : '');
  const name = (overrides.name && overrides.name.trim()) || memberDoc.name || raw.name || '';
  const business = overrides.business !== undefined ? overrides.business.trim() : (memberDoc.business || raw.business || '');
  const mobile = memberDoc.mobile || raw.mobile || '';
  const avatar = overrides.avatar !== undefined ? overrides.avatar : (memberDoc.avatar !== undefined ? memberDoc.avatar : (raw.avatar ?? null));

  return {
    id,
    membershipId,
    name,
    business,
    mobile,
    avatar,
  };
}

export async function resolveMember(memberInput, memberIdInput) {
  let memberDoc = null;
  const candidate =
    (memberInput && typeof memberInput === 'object' && (memberInput.memberId || memberInput._id || memberInput.id)) ||
    memberIdInput ||
    (typeof memberInput === 'string' && memberInput) ||
    null;

  if (candidate) {
    const strCandidate = String(candidate).trim();
    if (mongoose.Types.ObjectId.isValid(strCandidate)) {
      memberDoc = await Member.findById(strCandidate);
    }
    if (!memberDoc) {
      const num = Number(strCandidate);
      if (!isNaN(num)) {
        memberDoc = await Member.findOne({ id: num });
      }
    }
    if (!memberDoc) {
      memberDoc = await Member.findOne({
        $or: [
          { membershipId: strCandidate },
          { email: strCandidate.toLowerCase() },
          { name: strCandidate },
        ],
      });
    }
  }

  if (!memberDoc && memberInput && typeof memberInput === 'object' && memberInput.name) {
    memberDoc = await Member.findOne({ name: new RegExp(`^${memberInput.name.trim()}$`, 'i') });
  }

  // Priority fallback: Real member 18 from Member collection ("testt", "JBAD168")
  if (!memberDoc) {
    memberDoc = await Member.findOne({ id: 18 });
  }
  // Otherwise latest approved member
  if (!memberDoc) {
    memberDoc = await Member.findOne({ status: 'approved' }).sort({ id: -1 });
  }
  // Otherwise latest registered member
  if (!memberDoc) {
    memberDoc = await Member.findOne({}).sort({ id: -1 });
  }

  if (!memberDoc) {
    throw ApiError.badRequest('No registered members found in database to associate with post.');
  }

  const overrides = {};
  if (memberInput && typeof memberInput === 'object') {
    if (memberInput.name && memberInput.name.trim() && memberInput.name.trim() !== memberDoc.name) {
      overrides.name = memberInput.name.trim();
    }
    if (memberInput.business !== undefined && memberInput.business.trim() !== (memberDoc.business || '')) {
      overrides.business = memberInput.business.trim();
    }
    if (memberInput.avatar !== undefined) {
      overrides.avatar = memberInput.avatar;
    }
  }

  return formatMemberSnapshot(memberDoc, overrides);
}

export async function resolvePostedBy(postedByInput, memberInput, memberIdInput, adminUser) {
  // 1. If postedByInput is provided as an object:
  if (postedByInput && typeof postedByInput === 'object') {
    const role = (postedByInput.role || '').toLowerCase();
    if (role === 'admin' || postedByInput.admin) {
      const adm = postedByInput.admin || {};
      const id = adm.id !== undefined ? Number(adm.id) : (adminUser?.id || 1);
      const name = adm.name || adminUser?.fullName || adminUser?.name || 'JAA Admin';
      const email = adm.email || adminUser?.email || 'admin@jaa.com';
      const avatar = adm.avatar !== undefined ? adm.avatar : (adminUser?.avatar || adminUser?.profilePhoto || '/uploads/admin-profile.png');
      return {
        role: 'admin',
        admin: {
          id: id || 1,
          name: name || 'JAA Admin',
          email: email || 'admin@jaa.com',
          avatar: avatar || '/uploads/admin-profile.png',
        },
      };
    }

    if (role === 'member' || postedByInput.member) {
      const memberSnapshot = await resolveMember(postedByInput.member || memberInput, postedByInput.memberId || memberIdInput);
      return {
        role: 'member',
        member: memberSnapshot || {
          id: 18,
          membershipId: 'JBAD168',
          name: 'testt',
          business: 'test',
          mobile: '9737126164',
          avatar: '/uploads/jaa-logo-1792992678372.png',
        },
      };
    }
  }

  // 2. If postedBy is string:
  if (typeof postedByInput === 'string') {
    const str = postedByInput.trim().toLowerCase();
    if (str === 'admin' || str === 'super admin') {
      return {
        role: 'admin',
        admin: {
          id: adminUser?.id || 1,
          name: adminUser?.fullName || adminUser?.name || 'JAA Admin',
          email: adminUser?.email || 'admin@jaa.com',
          avatar: adminUser?.avatar || adminUser?.profilePhoto || '/uploads/admin-profile.png',
        },
      };
    }
    if (str === 'member') {
      const memberSnapshot = await resolveMember(memberInput, memberIdInput);
      return {
        role: 'member',
        member: memberSnapshot || {
          id: 18,
          membershipId: 'JBAD168',
          name: 'testt',
          business: 'test',
          mobile: '9737126164',
          avatar: '/uploads/jaa-logo-1792992678372.png',
        },
      };
    }
  }

  // 3. If explicit member is passed without postedBy:
  if (memberInput || memberIdInput) {
    const memberSnapshot = await resolveMember(memberInput, memberIdInput);
    if (memberSnapshot) {
      return {
        role: 'member',
        member: memberSnapshot,
      };
    }
  }

  // 4. Default: Admin (matching user request)
  return {
    role: 'admin',
    admin: {
      id: adminUser?.id || 1,
      name: adminUser?.fullName || adminUser?.name || 'JAA Admin',
      email: adminUser?.email || 'admin@jaa.com',
      avatar: adminUser?.avatar || adminUser?.profilePhoto || '/uploads/admin-profile.png',
    },
  };
}

export class PostService {
  static async enrichPost(postDoc) {
    if (!postDoc) return postDoc;
    const obj = typeof postDoc.toJSON === 'function' ? postDoc.toJSON() : { ...postDoc };
    delete obj.mediaType;
    delete obj.allowcomments;
    delete obj.ispinned;
    delete obj.member;
    obj.status = (obj.status || 'published').toLowerCase();

    if (obj.postedBy) {
      const role = (obj.postedBy.role || 'admin').toLowerCase();
      if (role === 'admin') {
        const adm = obj.postedBy.admin || {};
        obj.postedBy = {
          role: 'admin',
          admin: {
            id: adm.id !== undefined ? Number(adm.id) : 1,
            name: adm.name || 'JAA Admin',
            email: adm.email || 'admin@jaa.com',
            avatar: adm.avatar !== undefined ? adm.avatar : '/uploads/admin-profile.png',
          },
        };
      } else if (role === 'member') {
        const mem = obj.postedBy.member || {};
        obj.postedBy = {
          role: 'member',
          member: {
            id: mem.id !== undefined ? Number(mem.id) : 18,
            membershipId: mem.membershipId || 'JBAD168',
            name: mem.name || 'testt',
            business: mem.business || 'test',
            mobile: mem.mobile || '9737126164',
            avatar: mem.avatar !== undefined ? mem.avatar : '/uploads/jaa-logo-1792992678372.png',
          },
        };
      }
    } else {
      obj.postedBy = {
        role: 'admin',
        admin: {
          id: 1,
          name: 'JAA Admin',
          email: 'admin@jaa.com',
          avatar: '/uploads/admin-profile.png',
        },
      };
    }

    return obj;
  }

  static async getPosts({ search = '', mediaType = '', location = '', isPinned, status = '', page = 1, limit = 20, full = false } = {}) {
    const filter = {};

    if (status && status !== 'all' && status !== 'All') {
      filter.status = status.toLowerCase();
    }

    if (mediaType && mediaType !== 'all' && mediaType !== 'All') {
      const lower = mediaType.toLowerCase();
      if (lower === 'video') {
        filter['media.fileType'] = /^video\//i;
      } else if (lower === 'notice' || lower === 'pdf' || lower === 'document') {
        filter['media.fileType'] = /pdf/i;
      } else if (lower === 'photo' || lower === 'image') {
        filter['media.fileType'] = /^image\//i;
      } else {
        filter['media.fileType'] = new RegExp(mediaType, 'i');
      }
    }

    if (location && location !== 'all' && location !== 'All') {
      filter.location = new RegExp(location.trim(), 'i');
    }

    if (isPinned !== undefined && isPinned !== '' && isPinned !== 'all') {
      const boolVal = String(isPinned).toLowerCase() === 'true';
      filter.$or = [{ ispinned: boolVal }, { isPinned: boolVal }];
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: reg },
        { description: reg },
        { location: reg },
        { 'postedBy.admin.name': reg },
        { 'postedBy.admin.email': reg },
        { 'postedBy.member.name': reg },
        { 'postedBy.member.business': reg },
        { 'media.url': reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 20);

    const [items, total] = await Promise.all([
      Post.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Post.countDocuments(filter),
    ]);

    const enriched = await Promise.all(items.map((item) => this.enrichPost(item)));
    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    const isFull = full === true || full === 'true';
    const listItems = isFull
      ? enriched
      : enriched.map((item) => ({
          id: item.id,
          title: item.title,
          media: Array.isArray(item.media) && item.media.length > 0 ? [item.media[0]] : [],
          postedBy: item.postedBy,
          createdAt: item.createdAt,
          status: item.status || 'published',
        }));

    return {
      data: listItems,
      pagination,
    };
  }

  static async getPostById(id) {
    const post = await Post.findOne(buildIdQuery(id));
    if (!post) {
      throw ApiError.notFound(`Post with ID '${id}' was not found`);
    }
    return await this.enrichPost(post);
  }

  static async createPost(data, currentUser) {
    let id;
    try {
      id = await getNextSequence('posts');
    } catch {
      const maxDoc = await Post.findOne().sort({ id: -1 });
      id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
    }

    const media = normalizeMediaArray(data.media);
    const postedBy = await resolvePostedBy(data.postedBy, data.member, data.memberId, currentUser);

    const allowComments =
      data.allowComments !== undefined
        ? Boolean(data.allowComments)
        : data.allowcomments !== undefined
        ? Boolean(data.allowcomments)
        : true;

    const isPinned =
      data.isPinned !== undefined
        ? Boolean(data.isPinned)
        : data.ispinned !== undefined
        ? Boolean(data.ispinned)
        : false;

    const status = data.status ? String(data.status).toLowerCase().trim() : 'published';

    const newPost = await Post.create({
      id,
      title: data.title,
      description: data.description || '',
      media,
      location: data.location || 'Ahmedabad',
      allowComments,
      isPinned,
      status,
      postedBy,
    });

    return await this.enrichPost(newPost);
  }

  static async updatePost(id, updates, currentUser) {
    const existing = await Post.findOne(buildIdQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Post with ID '${id}' was not found`);
    }

    const filtered = {};

    if (updates.title !== undefined) filtered.title = updates.title;
    if (updates.description !== undefined) filtered.description = updates.description;
    if (updates.location !== undefined) filtered.location = updates.location;

    if (updates.media !== undefined) {
      filtered.media = normalizeMediaArray(updates.media);
    }

    if (updates.allowcomments !== undefined || updates.allowComments !== undefined) {
      const val = updates.allowComments !== undefined ? Boolean(updates.allowComments) : Boolean(updates.allowcomments);
      filtered.allowComments = val;
    }

    if (updates.ispinned !== undefined || updates.isPinned !== undefined) {
      const val = updates.isPinned !== undefined ? Boolean(updates.isPinned) : Boolean(updates.ispinned);
      filtered.isPinned = val;
    }

    if (updates.status !== undefined) {
      filtered.status = String(updates.status).toLowerCase().trim();
    }

    if (updates.postedBy !== undefined || updates.member !== undefined || updates.memberId !== undefined) {
      filtered.postedBy = await resolvePostedBy(updates.postedBy, updates.member, updates.memberId, currentUser);
    }

    const updated = await Post.findOneAndUpdate(buildIdQuery(id), { $set: filtered }, { returnDocument: 'after' });
    return await this.enrichPost(updated);
  }

  static async deletePost(id) {
    const deleted = await Post.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Post with ID '${id}' was not found`);
    }
    return deleted;
  }
}
