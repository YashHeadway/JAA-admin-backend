import mongoose from 'mongoose';
import { formatDateTime } from '../utils/dateFormatter.js';

const committeeMemberSchema = new mongoose.Schema(
  {
    memberId: { type: Number, required: true, ref: 'Member', index: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const committeeSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    position: { type: String, required: true, trim: true },
    members: {
      type: [committeeMemberSchema],
      default: [],
    },
    totalMembers: { type: Number, default: 0 },
    // Legacy fields supported for backwards compatibility
    fullName: { type: String, trim: true },
    dateOfBirth: { type: String },
    gender: { type: String },
    mobile: { type: String },
    email: { type: String },
    address: { type: String },
    role: { type: String },
    businessName: { type: String },
    businessType: { type: String },
    gstNumber: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (!ret.members || ret.members.length === 0) {
          if (ret.fullName) {
            ret.members = [
              {
                memberId: ret.id,
                name: ret.fullName,
              },
            ];
          } else {
            ret.members = [];
          }
        } else {
          ret.members = ret.members.map((m) => ({
            memberId: m.memberId,
            name: m.name,
          }));
        }
        ret.totalMembers = ret.members.length;
        delete ret.fullName;
        delete ret.dateOfBirth;
        delete ret.gender;
        delete ret.mobile;
        delete ret.email;
        delete ret.address;
        delete ret.role;
        delete ret.businessName;
        delete ret.businessType;
        delete ret.gstNumber;
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
        if (!ret.members || ret.members.length === 0) {
          if (ret.fullName) {
            ret.members = [
              {
                memberId: ret.id,
                name: ret.fullName,
              },
            ];
          } else {
            ret.members = [];
          }
        } else {
          ret.members = ret.members.map((m) => ({
            memberId: m.memberId,
            name: m.name,
          }));
        }
        ret.totalMembers = ret.members.length;
        delete ret.fullName;
        delete ret.dateOfBirth;
        delete ret.gender;
        delete ret.mobile;
        delete ret.email;
        delete ret.address;
        delete ret.role;
        delete ret.businessName;
        delete ret.businessType;
        delete ret.gstNumber;
        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

export const Committee = mongoose.models.Committee || mongoose.model('Committee', committeeSchema);
