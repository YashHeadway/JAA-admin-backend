import mongoose from 'mongoose';
import { formatDateTime, formatDateOnly } from '../utils/dateFormatter.js';

const memberSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    membershipId: { type: String },
    name: { type: String, required: true, trim: true },
    business: { type: String, required: true, trim: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    city: { type: String, default: 'Ahmedabad' },
    dob: { type: String },
    address: { type: String },
    businessType: {
      type: String,
      default: 'Retailer',
    },
    joinedOn: { type: String },
    avatar: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.country;
        if (ret.joinedOn) ret.joinedOn = formatDateOnly(ret.joinedOn);
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
        delete ret.country;
        if (ret.joinedOn) ret.joinedOn = formatDateOnly(ret.joinedOn);
        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

export const Member = mongoose.models.Member || mongoose.model('Member', memberSchema);
