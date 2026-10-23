import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getNextSequence } from './Counter.js';
import { formatDateTime } from '../utils/dateFormatter.js';

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['Admin', 'Super Admin', 'Committee Member', 'Member'],
      default: 'Admin',
    },
    dob: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    mobile: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    avatar: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  {
    timestamps: true,
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

// Auto-assign sequential ID and hash password on save
userSchema.pre('save', async function () {
  if (!this.id) {
    try {
      this.id = await getNextSequence('users');
    } catch {
      const maxUser = await mongoose.model('User').findOne().sort({ id: -1 });
      this.id = maxUser && maxUser.id ? maxUser.id + 1 : 1;
    }
  }

  if (this.isModified('password')) {
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
});

// Compare password helper (supports bcrypt hash, direct match, and plaintext fallback)
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  if (candidatePassword === this.password) return true;
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  return this.password === candidatePassword;
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);

