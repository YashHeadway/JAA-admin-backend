import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String },
    type: { type: String, default: 'Photo' },
    category: { type: String, default: 'Photos' },
    postedBy: { type: String, default: 'Harvey Specter' },
    authorEmail: { type: String, default: 'harveyspecter@gmail.com' },
    authorAvatar: { type: String, default: '/images/members/harvey-specter.jpg' },
    postThumbnail: { type: String, default: null },
    mainMedia: { type: String },
    date: { type: String },
    status: { type: String, default: 'Published' },
    description: { type: String },
    attachments: [{ type: String }],
    gallery: [{ type: String }],
    allowComments: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
    location: { type: String, default: 'Ahmedabad, Gujarat' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
