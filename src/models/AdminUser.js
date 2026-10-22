import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getNextSequence } from './Counter.js';

const adminUserSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, default: 'Admin' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Admin' },
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
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
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

// Compare password helper (supports bcrypt hash)
adminUserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  return this.password === candidatePassword;
};

export const AdminUser =
  mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema, 'admin-users');
