import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const committeeSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, required: true },
    gender: {
      type: String,
      required: true,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    position: {
      type: String,
      required: true,
      enum: [
        'President',
        'Vice President',
        'Secretary',
        'Joint Secretary',
        'Treasurer',
        'Committee Member',
      ],
      default: 'Committee Member',
    },
    role: { type: String, default: 'Committee Member' },
    businessName: { type: String, required: true, trim: true },
    businessType: {
      type: String,
      required: true,
      enum: ['B2B', 'B2C'],
      default: 'B2C',
    },
    gstNumber: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.name;
        delete ret.dob;
        delete ret.phone;
        delete ret.committee;
        delete ret.avatar;
        delete ret.status;
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
        delete ret.name;
        delete ret.dob;
        delete ret.phone;
        delete ret.committee;
        delete ret.avatar;
        delete ret.status;
        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

export const Committee = mongoose.models.Committee || mongoose.model('Committee', committeeSchema);
