import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const eventSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    image: { type: String, default: '/uploads/events/workshop.jpg' },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    city: { type: String, default: 'Ahmedabad' },
    address: { type: String, required: true },
    postedBy: { type: String, default: 'Admin' },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
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
        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
