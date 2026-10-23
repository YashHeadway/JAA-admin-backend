import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';
import { formatDateTime } from '../utils/dateFormatter.js';

const adminProfileSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    userId: { type: Number, index: true },
    fullName: { type: String, required: true, trim: true, default: 'Harvey Specter' },
    dateOfBirth: { type: String, required: true, default: '2000-07-31' },
    gender: {
      type: String,
      required: true,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    mobile: { type: String, required: true, default: '+91988774455' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, default: 'admin@gmail.com' },
    address: { type: String, required: true, default: 'The Exhibition Center, Science Road' },
    city: { type: String, required: true, default: 'Ahmedabad' },
    pincode: { type: String, required: true, default: '380009' },
    profilePhoto: { type: String, default: 'https://example.com/uploads/profile.jpg' },
  },
  {
    timestamps: true,
    collection: 'admin_profiles',
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        return {
          id: ret.id,
          fullName: ret.fullName,
          dateOfBirth: ret.dateOfBirth,
          gender: ret.gender,
          mobile: ret.mobile,
          email: ret.email,
          address: ret.address,
          city: ret.city,
          pincode: ret.pincode,
          profilePhoto: ret.profilePhoto,
          createdAt: ret.createdAt ? formatDateTime(ret.createdAt) : undefined,
          updatedAt: ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined,
        };
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        return {
          id: ret.id,
          fullName: ret.fullName,
          dateOfBirth: ret.dateOfBirth,
          gender: ret.gender,
          mobile: ret.mobile,
          email: ret.email,
          address: ret.address,
          city: ret.city,
          pincode: ret.pincode,
          profilePhoto: ret.profilePhoto,
          createdAt: ret.createdAt ? formatDateTime(ret.createdAt) : undefined,
          updatedAt: ret.updatedAt ? formatDateTime(ret.updatedAt) : undefined,
        };
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
  mongoose.models.AdminProfile || mongoose.model('AdminProfile', adminProfileSchema, 'admin_profiles');
