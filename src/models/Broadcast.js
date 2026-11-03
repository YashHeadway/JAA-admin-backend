import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const broadcastSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    broadcastTitle: { type: String, trim: true },
    message: { type: String, required: true },
    attachment: { type: String, default: null },
    sentOn: { type: String },
    sentTo: { type: String, default: 'All Members' },
    sendTo: { type: String },
    status: { type: String, default: 'Delivered' },
    group_id: { type: mongoose.Schema.Types.Mixed, default: null },
    groupId: { type: mongoose.Schema.Types.Mixed, default: null },
    groupName: { type: String, default: null },
    createdBy: { type: String, default: 'Admin User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.sentTo;
        delete ret.groupName;
        delete ret.groupId;

        const broadcastTitle = ret.broadcastTitle || ret.title || '';
        const title = ret.title || ret.broadcastTitle || '';
        const sendTo = ret.sendTo || doc.sentTo || doc.sendTo || 'All Members';

        // Format group_id object if broadcast belongs to a group
        const groupData = doc.group_id || ret.group_id;
        const gId = doc.groupId || ret.groupId || (groupData && typeof groupData === 'object' ? groupData.id : groupData);
        const gName = doc.groupName || ret.groupName || (groupData && typeof groupData === 'object' ? (groupData.name || groupData.groupName) : null);

        let groupObj = null;
        if (gId !== null && gId !== undefined && String(gId).trim() !== '') {
          groupObj = {
            id: typeof gId === 'number' ? gId : (Number(gId) || gId),
            name: gName || (groupData && typeof groupData === 'object' ? (groupData.name || groupData.groupName) : sendTo),
          };
        } else if (groupData && typeof groupData === 'object' && groupData.id) {
          groupObj = {
            id: typeof groupData.id === 'number' ? groupData.id : (Number(groupData.id) || groupData.id),
            name: groupData.name || groupData.groupName || sendTo,
          };
        }

        const createdBy = ret.createdBy || doc.createdBy || 'Admin User';
        const createdAt = ret.createdAt ? formatDateTime(ret.createdAt) : undefined;
        const updatedAt = ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined;

        const out = {
          id: ret.id,
          title,
          broadcastTitle,
          message: ret.message,
          attachment: ret.attachment || null,
          sentOn: ret.sentOn || '',
          sendTo,
          status: ret.status || 'Delivered',
          group_id: groupObj,
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
        delete ret.sentTo;
        delete ret.groupName;
        delete ret.groupId;

        const broadcastTitle = ret.broadcastTitle || ret.title || '';
        const title = ret.title || ret.broadcastTitle || '';
        const sendTo = ret.sendTo || doc.sentTo || doc.sendTo || 'All Members';

        // Format group_id object if broadcast belongs to a group
        const groupData = doc.group_id || ret.group_id;
        const gId = doc.groupId || ret.groupId || (groupData && typeof groupData === 'object' ? groupData.id : groupData);
        const gName = doc.groupName || ret.groupName || (groupData && typeof groupData === 'object' ? (groupData.name || groupData.groupName) : null);

        let groupObj = null;
        if (gId !== null && gId !== undefined && String(gId).trim() !== '') {
          groupObj = {
            id: typeof gId === 'number' ? gId : (Number(gId) || gId),
            name: gName || (groupData && typeof groupData === 'object' ? (groupData.name || groupData.groupName) : sendTo),
          };
        } else if (groupData && typeof groupData === 'object' && groupData.id) {
          groupObj = {
            id: typeof groupData.id === 'number' ? groupData.id : (Number(groupData.id) || groupData.id),
            name: groupData.name || groupData.groupName || sendTo,
          };
        }

        const createdBy = ret.createdBy || doc.createdBy || 'Admin User';
        const createdAt = ret.createdAt ? formatDateTime(ret.createdAt) : undefined;
        const updatedAt = ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined;

        const out = {
          id: ret.id,
          title,
          broadcastTitle,
          message: ret.message,
          attachment: ret.attachment || null,
          sentOn: ret.sentOn || '',
          sendTo,
          status: ret.status || 'Delivered',
          group_id: groupObj,
          createdBy,
        };

        if (createdAt !== undefined) out.createdAt = createdAt;
        if (updatedAt !== undefined) out.updatedAt = updatedAt;

        return out;
      },
    },
  }
);

export const Broadcast = mongoose.models.Broadcast || mongoose.model('Broadcast', broadcastSchema);
