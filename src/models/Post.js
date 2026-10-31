import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const mediaItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    fileType: { type: String, required: true, default: 'image/jpeg', trim: true },
  },
  { _id: false }
);

const adminRefSchema = new mongoose.Schema(
  {
    id: { type: Number, default: 1 },
    name: { type: String, default: 'JAA Admin', trim: true },
    email: { type: String, default: 'admin@jaa.com', trim: true },
    avatar: { type: String, default: '/uploads/admin-profile.png' },
  },
  { _id: false, strict: false }
);

const memberRefSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    membershipId: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    business: { type: String, default: '', trim: true },
    mobile: { type: String, default: '' },
    avatar: { type: String, default: null },
  },
  { _id: false, strict: false }
);

const postedBySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['admin', 'member'], default: 'admin', lowercase: true },
    admin: { type: adminRefSchema, default: undefined },
    member: { type: memberRefSchema, default: undefined },
  },
  { _id: false, strict: false }
);

const postSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    media: {
      type: [mediaItemSchema],
      default: [],
    },
    location: { type: String, default: 'Ahmedabad', trim: true },
    allowComments: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['published', 'draft'],
      default: 'published',
      lowercase: true,
      trim: true,
    },
    postedBy: {
      type: postedBySchema,
      default: () => ({
        role: 'admin',
        admin: {
          id: 1,
          name: 'JAA Admin',
          email: 'admin@jaa.com',
          avatar: '/uploads/admin-profile.png',
        },
      }),
    },
    member: {
      type: memberRefSchema,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.mediaType;
        delete ret.allowcomments;
        delete ret.ispinned;
        delete ret.member;
        ret.allowComments = ret.allowComments !== undefined ? ret.allowComments : (ret.allowcomments ?? true);
        ret.isPinned = ret.isPinned !== undefined ? ret.isPinned : (ret.ispinned ?? false);
        ret.status = (ret.status || 'published').toLowerCase();

        if (ret.postedBy) {
          const role = (ret.postedBy.role || 'admin').toLowerCase();
          if (role === 'admin') {
            const adm = ret.postedBy.admin || {};
            ret.postedBy = {
              role: 'admin',
              admin: {
                id: adm.id !== undefined ? Number(adm.id) : 1,
                name: adm.name || 'JAA Admin',
                email: adm.email || 'admin@jaa.com',
                avatar: adm.avatar !== undefined ? adm.avatar : '/uploads/admin-profile.png',
              },
            };
          } else if (role === 'member') {
            const mem = ret.postedBy.member || {};
            ret.postedBy = {
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
          ret.postedBy = {
            role: 'admin',
            admin: {
              id: 1,
              name: 'JAA Admin',
              email: 'admin@jaa.com',
              avatar: '/uploads/admin-profile.png',
            },
          };
        }

        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.mediaType;
        delete ret.allowcomments;
        delete ret.ispinned;
        delete ret.member;
        ret.allowComments = ret.allowComments !== undefined ? ret.allowComments : (ret.allowcomments ?? true);
        ret.isPinned = ret.isPinned !== undefined ? ret.isPinned : (ret.ispinned ?? false);
        ret.status = (ret.status || 'published').toLowerCase();

        if (ret.postedBy) {
          const role = (ret.postedBy.role || 'admin').toLowerCase();
          if (role === 'admin') {
            const adm = ret.postedBy.admin || {};
            ret.postedBy = {
              role: 'admin',
              admin: {
                id: adm.id !== undefined ? Number(adm.id) : 1,
                name: adm.name || 'JAA Admin',
                email: adm.email || 'admin@jaa.com',
                avatar: adm.avatar !== undefined ? adm.avatar : '/uploads/admin-profile.png',
              },
            };
          } else if (role === 'member') {
            const mem = ret.postedBy.member || {};
            ret.postedBy = {
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
          ret.postedBy = {
            role: 'admin',
            admin: {
              id: 1,
              name: 'JAA Admin',
              email: 'admin@jaa.com',
              avatar: '/uploads/admin-profile.png',
            },
          };
        }

        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

postSchema.pre('save', function () {
  if (this.allowcomments !== undefined && this.allowComments === undefined) {
    this.allowComments = this.allowcomments;
  }
  if (this.ispinned !== undefined && this.isPinned === undefined) {
    this.isPinned = this.ispinned;
  }
  if (this.status) {
    this.status = this.status.toLowerCase();
  } else {
    this.status = 'published';
  }
  if (!this.postedBy || !this.postedBy.role) {
    if (this.member && this.member.id) {
      this.postedBy = {
        role: 'member',
        member: this.member,
      };
    } else {
      this.postedBy = {
        role: 'admin',
        admin: {
          id: 1,
          name: 'JAA Admin',
          email: 'admin@jaa.com',
          avatar: '/uploads/admin-profile.png',
        },
      };
    }
  }
});

export const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
