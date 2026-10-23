import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getNextSequence } from './Counter.js';
import { formatDateTime } from '../utils/dateFormatter.js';

const adminUserSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    fullName: { type: String, default: 'Harvey Specter' },
    name: { type: String, default: 'Harvey Specter' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Admin' },
    dateOfBirth: { type: String, default: '2000-07-31' },
    dob: { type: String, default: '2000-07-31' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    mobile: { type: String, default: '+91988774455' },
    address: { type: String, default: 'The Exhibition Center, Science Road' },
    city: { type: String, default: 'Ahmedabad' },
    pincode: { type: String, default: '380009' },
    profilePhoto: { type: String, default: 'https://example.com/uploads/profile.jpg' },
    avatar: { type: String, default: 'https://example.com/uploads/profile.jpg' },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'admin-users',
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
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
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        if (ret.createdAt) ret.createdAt = formatDateTime(ret.createdAt);
        if (ret.updatedAt) ret.updatedAt = formatDateTime(ret.updatedAt);
        return ret;
      },
    },
  }
);

// Auto-assign sequential integer ID and hash password on save
adminUserSchema.pre('save', async function () {
  if (!this.id) {
    try {
      this.id = await getNextSequence('admin-users');
    } catch {
      const maxAdmin = await mongoose.model('AdminUser').findOne().sort({ id: -1 });
      this.id = maxAdmin && maxAdmin.id ? maxAdmin.id + 1 : 1;
    }
  }

  if (this.isModified('password')) {
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
});

// Compare password helper (supports bcrypt hash and direct match)
adminUserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  if (candidatePassword === this.password) return true;
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  return this.password === candidatePassword;
};

export const AdminUser =
  mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema, 'admin-users');
