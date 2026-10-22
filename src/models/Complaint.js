import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    against: { type: String, required: true, trim: true },
    againstId: { type: mongoose.Schema.Types.Mixed, default: 'Visitor' },
    againstType: { type: String, default: 'member' },
    avatar: { type: String, default: null },
    type: { type: String, required: true },
    typeSubtitle: { type: String },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: {
      type: String,
      default: 'New',
    },
    date: { type: String },
    time: { type: String },
    previousInteraction: { type: String },
    preferredResolution: { type: String },
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

export const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
