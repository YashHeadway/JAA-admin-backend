import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    sentOn: { type: String },
    sentTo: { type: String, default: 'All Members' },
    status: { type: String, default: 'Delivered' },
    groupId: { type: mongoose.Schema.Types.Mixed, default: null },
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

export const Broadcast = mongoose.models.Broadcast || mongoose.model('Broadcast', broadcastSchema);
