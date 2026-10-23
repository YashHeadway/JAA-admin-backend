import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const leadSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    leadName: { type: String, trim: true },
    name: { type: String, trim: true },
    businessName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    businessType: { type: String, default: 'Retailer' },
    gstNumber: { type: String, default: '' },
    city: { type: String, default: 'Ahmedabad' },
    pincode: { type: String, default: '' },
    address: { type: String, default: '' },
    source: { type: String, default: 'Website' },
    status: {
      type: String,
      default: 'Newest',
    },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (!ret.leadName && ret.name) ret.leadName = ret.name;
        if (!ret.name && ret.leadName) ret.name = ret.leadName;
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
        if (!ret.leadName && ret.name) ret.leadName = ret.name;
        if (!ret.name && ret.leadName) ret.name = ret.leadName;
        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
