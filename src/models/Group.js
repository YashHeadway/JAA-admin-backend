import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const groupMemberSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.Mixed },
    id: { type: mongoose.Schema.Types.Mixed },
    name: { type: String, default: '' },
    mobile: { type: String, default: '' },
    email: { type: String, default: '' },
    avatar: { type: String, default: null },
    business: { type: String, default: '' },
    membershipId: { type: String, default: '' },
  },
  { _id: false }
);

const recentBroadcastItemSchema = new mongoose.Schema(
  {
    id: { type: Number },
    title: { type: String, default: '' },
    broadcastTitle: { type: String, default: '' },
    message: { type: String, default: '' },
    sentOn: { type: String, default: '' },
    sendTo: { type: String, default: 'All Members' },
    group_id: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, default: 'Delivered' },
    attachment: { type: String, default: null },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    groupName: { type: String, trim: true },
    memberCount: { type: Number, default: 0 },
    about: { type: String, default: '' },
    description: { type: String, default: '' },
    groupType: { type: String, default: 'All Members' },
    createdOn: { type: String },
    createdBy: { type: String, default: 'Admin User' },
    status: { type: Boolean, default: true },
    excelFile: { type: String, default: null },
    members: [groupMemberSchema],
    recentBroadcasts: [recentBroadcastItemSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.memberCount;
        delete ret.about;
        delete ret.groupType;
        delete ret.createdOn;
        delete ret.status;
        delete ret.excelFile;
        delete ret.recentBroadcasts;

        const groupName = ret.groupName || ret.name || '';
        const name = ret.name || ret.groupName || '';
        const description = ret.description || ret.about || '';

        // Format members array cleanly with all required fields
        let members = [];
        if (Array.isArray(ret.members)) {
          members = ret.members.map((m) => {
            const mId = m.id !== undefined && m.id !== null ? m.id : m.memberId;
            return {
              id: mId,
              memberId: m.memberId || mId,
              membershipId: m.membershipId || '',
              name: m.name || '',
              business: m.business || '',
              mobile: m.mobile || '',
              email: m.email || '',
              avatar: m.avatar || null,
            };
          });
        }

        // Ensure createdBy, createdAt, updatedAt are placed strictly at the bottom
        const createdBy = ret.createdBy || doc.createdBy || 'Admin User';
        const createdAt = ret.createdAt ? formatDateTime(ret.createdAt) : undefined;
        const updatedAt = ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined;

        const out = {
          id: ret.id,
          groupName,
          name,
          description,
          members,
          createdBy,
        };

        if (createdAt !== undefined) out.createdAt = createdAt;
        if (updatedAt !== undefined) out.updatedAt = updatedAt;

        return out;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.memberCount;
        delete ret.about;
        delete ret.groupType;
        delete ret.createdOn;
        delete ret.status;
        delete ret.excelFile;
        delete ret.recentBroadcasts;

        const groupName = ret.groupName || ret.name || '';
        const name = ret.name || ret.groupName || '';
        const description = ret.description || ret.about || '';

        let members = [];
        if (Array.isArray(ret.members)) {
          members = ret.members.map((m) => {
            const mId = m.id !== undefined && m.id !== null ? m.id : m.memberId;
            return {
              id: mId,
              memberId: m.memberId || mId,
              membershipId: m.membershipId || '',
              name: m.name || '',
              business: m.business || '',
              mobile: m.mobile || '',
              email: m.email || '',
              avatar: m.avatar || null,
            };
          });
        }

        const createdBy = ret.createdBy || doc.createdBy || 'Admin User';
        const createdAt = ret.createdAt ? formatDateTime(ret.createdAt) : undefined;
        const updatedAt = ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined;

        const out = {
          id: ret.id,
          groupName,
          name,
          description,
          members,
          createdBy,
        };

        if (createdAt !== undefined) out.createdAt = createdAt;
        if (updatedAt !== undefined) out.updatedAt = updatedAt;

        return out;
      },
    },
  }
);

export const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
