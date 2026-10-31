import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';
import { formatDateTime } from '../utils/dateFormatter.js';

const adminProfileSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    userId: { type: Number, index: true },
    name: { type: String, default: '' },
    fullName: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' },
    role: { type: String, default: 'admin' },
    dateOfBirth: { type: String, default: '' },
    dob: { type: String, default: '' },
    gender: {
      type: String,
      default: '',
    },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    image: { type: String, default: null },
    avatar: { type: String, default: null },
    profilePhoto: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    status: { type: String, default: 'active' },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'admin_profiles',
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        if (!ret.profilePhoto && (ret.image || ret.avatar)) {
          ret.profilePhoto = ret.image || ret.avatar;
        }
        delete ret.image;
        delete ret.avatar;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        if (!ret.profilePhoto && (ret.image || ret.avatar)) {
          ret.profilePhoto = ret.image || ret.avatar;
        }
        delete ret.image;
        delete ret.avatar;
        return ret;
      },
    },
  }
);

// Auto-assign sequential integer ID
adminProfileSchema.pre('save', async function () {
  if (!this.id) {
    try {
      this.id = await getNextSequence('admin_profiles');
    } catch {
      const maxDoc = await mongoose.model('AdminProfile').findOne().sort({ id: -1 });
      this.id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
    }
  }
});

export const AdminProfile =
  mongoose.models.AdminProfile ||
  mongoose.model('AdminProfile', adminProfileSchema, 'admin_profiles');
