import mongoose from 'mongoose';

const committeeSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    dob: { type: String },
    gender: { type: String, default: 'Male' },
    position: { type: String, required: true },
    committee: { type: String, required: true },
    role: { type: String, default: 'Executive Panel' },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String },
    businessName: { type: String },
    businessType: { type: String },
    gstNumber: { type: String },
    avatar: { type: String, default: null },
    status: { type: String, default: 'Active' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Committee = mongoose.models.Committee || mongoose.model('Committee', committeeSchema);
