import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      index: true,
    },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
    status: {
      type: String,
      default: 'ACTIVE',
      trim: true,
    },

    // Backward-compatible fields
    leadName: { type: String, trim: true },
    name: { type: String, trim: true },
    businessName: { type: String, trim: true, default: '' },
    mobile: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    businessType: { type: String, default: 'Retailer' },
    gstNumber: { type: String, default: '' },
    city: { type: String, default: 'Ahmedabad' },
    pincode: { type: String, default: '380009' },
    address: { type: String, default: '' },
    source: { type: String, default: 'Website' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (!ret.title && (ret.leadName || ret.name)) {
          ret.title = ret.leadName || ret.name;
        }
        if (ret.status) ret.status = ret.status.toUpperCase();
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (!ret.title && (ret.leadName || ret.name)) {
          ret.title = ret.leadName || ret.name;
        }
        if (ret.status) ret.status = ret.status.toUpperCase();
        return ret;
      },
    },
  }
);

leadSchema.pre('save', function () {
  if (!this.title) {
    this.title = this.leadName || this.name || 'Gold Worker Required';
  }
  if (!this.leadName) {
    this.leadName = this.title;
  }
  if (!this.name) {
    this.name = this.title;
  }
  if (!this.image) {
    this.image = 'https://yourdomain.com/uploads/gold-worker.jpg';
  }
  if (this.status) {
    this.status = this.status.toUpperCase();
  } else {
    this.status = 'ACTIVE';
  }
});

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
