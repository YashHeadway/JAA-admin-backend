import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    conversationId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, default: 'Member' },
    senderAvatar: { type: String, default: null },
    senderRole: { type: String, default: 'member' },
    receiverId: { type: String, index: true },
    member: { type: mongoose.Schema.Types.Mixed, default: null },
    text: { type: String, default: '' },
    mediaUrl: { type: String, default: null },
    messageType: { type: String, default: 'text' },
    isRead: { type: Boolean, default: false },
    createdAt: { type: mongoose.Schema.Types.Mixed, default: () => formatDateTime(new Date()) },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    directKey: { type: String, index: true },
    type: { type: String, default: 'direct' },
    participants: [{ type: String, index: true }],
    participantDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastMessage: {
      id: { type: String },
      text: { type: String, default: '' },
      senderId: { type: String },
      senderName: { type: String },
      messageType: { type: String, default: 'text' },
      createdAt: { type: mongoose.Schema.Types.Mixed },
    },
    lastMessageAt: { type: mongoose.Schema.Types.Mixed },
    unreadCounts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    messages: [chatMessageSchema],
  },
  {
    timestamps: true,
    collection: 'chats',
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (ret.createdAt instanceof Date) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt instanceof Date) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (ret.createdAt instanceof Date) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt instanceof Date) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export const Conversation = Chat;
export default Chat;
