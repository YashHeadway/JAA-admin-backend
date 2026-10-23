import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const postSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    media: { type: String, required: true },
    mediaType: {
      type: String,
      enum: ['Photo', 'Video', 'Notice'],
      default: 'Photo',
    },
    location: { type: String, default: 'Ahmedabad' },
    allowComments: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.subtitle;
        delete ret.type;
        delete ret.category;
        delete ret.postedBy;
        delete ret.authorEmail;
        delete ret.authorAvatar;
        delete ret.postThumbnail;
        delete ret.mainMedia;
        delete ret.date;
        delete ret.status;
        delete ret.attachments;
        delete ret.gallery;
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
        delete ret.subtitle;
        delete ret.type;
        delete ret.category;
        delete ret.postedBy;
        delete ret.authorEmail;
        delete ret.authorAvatar;
        delete ret.postThumbnail;
        delete ret.mainMedia;
        delete ret.date;
        delete ret.status;
        delete ret.attachments;
        delete ret.gallery;
        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

export const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
