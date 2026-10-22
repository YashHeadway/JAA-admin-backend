import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    memberCount: { type: Number, default: 0 },
    about: { type: String },
    groupType: { type: String, default: 'All Members' },
    createdOn: { type: String },
    createdBy: { type: String, default: 'Admin User' },
    status: { type: Boolean, default: true },
    recentBroadcasts: [{ type: Object }],
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

export const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
