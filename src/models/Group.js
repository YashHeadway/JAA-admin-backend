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
        ret.groupName = ret.groupName || ret.name;
        ret.name = ret.name || ret.groupName;
        ret.description = ret.description || ret.about || '';
        ret.about = ret.about || ret.description || '';

        // Sanitize recentBroadcasts items
        if (Array.isArray(ret.recentBroadcasts)) {
          ret.recentBroadcasts = ret.recentBroadcasts.map((b) => {
            const rawG = b.group_id !== undefined ? b.group_id : b.groupId;
            let groupObj = null;
            if (rawG && typeof rawG === 'object' && rawG.id) {
              groupObj = {
                id: typeof rawG.id === 'number' ? rawG.id : (Number(rawG.id) || rawG.id),
                name: rawG.name || rawG.groupName || ret.name,
              };
            } else if (rawG !== null && rawG !== undefined && String(rawG).trim() !== '') {
              const numGId = Number(rawG);
              if (!isNaN(numGId)) {
                groupObj = { id: numGId, name: ret.name || ret.groupName || '' };
              }
            }

            return {
              id: b.id,
              title: b.title || b.broadcastTitle || '',
              broadcastTitle: b.broadcastTitle || b.title || '',
              message: b.message || '',
              sentOn: b.sentOn || '',
              sendTo: b.sendTo || b.sentTo || ret.name || 'All Members',
              status: b.status || 'Delivered',
              attachment: b.attachment || null,
              group_id: groupObj,
            };
          });
        }

        // Ensure createdBy, createdAt, updatedAt are placed at the bottom
        const createdBy = ret.createdBy || doc.createdBy || 'Admin User';
        const createdAt = ret.createdAt ? formatDateTime(ret.createdAt) : undefined;
        const updatedAt = ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined;

        delete ret.createdBy;
        delete ret.createdAt;
        delete ret.updatedAt;

        if (createdBy !== undefined) ret.createdBy = createdBy;
        if (createdAt !== undefined) ret.createdAt = createdAt;
        if (updatedAt !== undefined) ret.updatedAt = updatedAt;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.memberCount;
        ret.groupName = ret.groupName || ret.name;
        ret.name = ret.name || ret.groupName;
        ret.description = ret.description || ret.about || '';
        ret.about = ret.about || ret.description || '';

        // Sanitize recentBroadcasts items
        if (Array.isArray(ret.recentBroadcasts)) {
          ret.recentBroadcasts = ret.recentBroadcasts.map((b) => {
            const rawG = b.group_id !== undefined ? b.group_id : b.groupId;
            let groupObj = null;
            if (rawG && typeof rawG === 'object' && rawG.id) {
              groupObj = {
                id: typeof rawG.id === 'number' ? rawG.id : (Number(rawG.id) || rawG.id),
                name: rawG.name || rawG.groupName || ret.name,
              };
            } else if (rawG !== null && rawG !== undefined && String(rawG).trim() !== '') {
              const numGId = Number(rawG);
              if (!isNaN(numGId)) {
                groupObj = { id: numGId, name: ret.name || ret.groupName || '' };
              }
            }

            return {
              id: b.id,
              title: b.title || b.broadcastTitle || '',
              broadcastTitle: b.broadcastTitle || b.title || '',
              message: b.message || '',
              sentOn: b.sentOn || '',
              sendTo: b.sendTo || b.sentTo || ret.name || 'All Members',
              status: b.status || 'Delivered',
              attachment: b.attachment || null,
              group_id: groupObj,
            };
          });
        }

        // Ensure createdBy, createdAt, updatedAt are placed at the bottom
        const createdBy = ret.createdBy || doc.createdBy || 'Admin User';
        const createdAt = ret.createdAt ? formatDateTime(ret.createdAt) : undefined;
        const updatedAt = ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined;

        delete ret.createdBy;
        delete ret.createdAt;
        delete ret.updatedAt;

        if (createdBy !== undefined) ret.createdBy = createdBy;
        if (createdAt !== undefined) ret.createdAt = createdAt;
        if (updatedAt !== undefined) ret.updatedAt = updatedAt;
        return ret;
      },
    },
  }
);

export const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
