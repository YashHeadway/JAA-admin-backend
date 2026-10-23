import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const complaintSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    complaintNumber: { type: String, index: true }, // e.g. "CMP-2026-001"
    complaintId: { type: mongoose.Schema.Types.Mixed, index: true },     // Sequential numeric ID: 1, 2, 3, 4...

    // Complaint Target Type
    complaintAgainst: {
      type: String,
      default: 'Member', // 'Member' | 'Other' | 'Non-Member' | 'Visitor'
      trim: true,
    },

    // Complainant Details (COMPLAINT BY)
    complaintBy: {
      memberId: { type: mongoose.Schema.Types.Mixed, default: 12 },
      name: { type: String, default: 'Ramesh Mehta' },
      business: { type: String, default: 'Mehta Jewellers' },
      mobile: { type: String, default: '9737126164' },
      email: { type: String, default: 'ramesh@gmail.com' },
      avatar: { type: String, default: '/uploads/members/ramesh.jpg' },
    },

    // Complaint Core Information
    complaintType: {
      type: String,
      required: true,
      trim: true,
      default: 'Payment Dispute',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'High',
    },
    status: {
      type: String,
      default: 'Open', // 'Open' | 'New' | 'In Progress' | 'Under Review' | 'Resolved' | 'Closed'
    },

    // History & Resolution
    hasPreviousInteraction: {
      type: Boolean,
      default: false,
    },
    preferredResolution: {
      type: String,
      default: 'Requesting immediate payment of pending amount.',
      trim: true,
    },

    // Incident & Financial Details
    complaintDetails: {
      incidentDate: { type: String, default: '2026-09-03' },
      incidentTime: { type: String, default: '14:30' },
      location: { type: String, default: 'Ahmedabad' },
      priority: { type: String, default: 'High' },
      proofAvailable: { type: Boolean, default: true },
      amountInvolved: { type: Number, default: 450000 },
    },

    // Description Details
    description: {
      issueSummary: { type: String, default: 'Payment not received for gold jewellery order' },
      detailedDescription: { type: String, default: 'Payment has not been received despite multiple reminders.' },
    },

    // Media
    media: [
      {
        url: { type: String, default: '' },
        type: { type: String, default: 'Photo' }, // 'Photo' | 'Video' | 'Document' | 'PDF'
      },
    ],

    // Admin Action Details
    adminAction: {
      resolutionNotes: { type: String, default: '' },
      updatedBy: { type: mongoose.Schema.Types.Mixed, default: null },
      updatedAt: { type: Date, default: null },
    },
    updatedBy: { type: mongoose.Schema.Types.Mixed, default: null },

    // Backward-compatibility references
    targetMemberId: { type: mongoose.Schema.Types.Mixed, default: null },
    member: {
      id: { type: mongoose.Schema.Types.Mixed, default: null },
      name: { type: String, default: '' },
    },
    resolutionNotes: { type: String, default: '' },
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

// Auto-assign sequential integer ID and complaintNumber/complaintId (e.g. CMP-2026-001)
complaintSchema.pre('save', async function () {
  if (!this.id) {
    try {
      this.id = await getNextSequence('complaints');
    } catch {
      const maxDoc = await mongoose.model('Complaint').findOne().sort({ id: -1 });
      this.id = maxDoc && maxDoc.id ? maxDoc.id + 1 : 1;
    }
  }

  if (!this.complaintNumber) {
    const year = new Date().getFullYear();
    this.complaintNumber = `CMP-${year}-${String(this.id).padStart(3, '0')}`;
  }

  if (this.complaintId === undefined || this.complaintId === null) {
    this.complaintId = this.id;
  }

  if (this.complaintDetails?.priority) {
    this.priority = this.complaintDetails.priority;
  } else if (this.priority) {
    if (!this.complaintDetails) this.complaintDetails = {};
    this.complaintDetails.priority = this.priority;
  }

  if (this.resolutionNotes && (!this.adminAction || !this.adminAction.resolutionNotes)) {
    if (!this.adminAction) this.adminAction = {};
    this.adminAction.resolutionNotes = this.resolutionNotes;
  }
});

export const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
