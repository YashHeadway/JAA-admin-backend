import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const complaintSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    complaintNumber: { type: String, index: true }, // e.g. "CMP-2026-001"
    complaintId: { type: mongoose.Schema.Types.Mixed, index: true }, // Sequential numeric ID: 1, 2, 3, 4...

    // Complaint Target Type: 'Member' or 'Other'
    complaintAgainst: {
      type: String,
      enum: ['Member', 'Other', 'Person', 'Non-Member'],
      default: 'Member',
      trim: true,
    },

    // Complainant Details (COMPLAINT BY - Registered Member)
    complaintBy: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
      memberObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
      memberId: { type: mongoose.Schema.Types.Mixed, default: null },
      membershipId: { type: String, default: '' },
      name: { type: String, default: '' },
      business: { type: String, default: '' },
      mobile: { type: String, default: '' },
      email: { type: String, default: '' },
      city: { type: String, default: 'Ahmedabad' },
      address: { type: String, default: '' },
      avatar: { type: String, default: null },
    },

    // Option 1: Complaint Against Registered Member (Target Member)
    targetMemberObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    targetMemberId: { type: mongoose.Schema.Types.Mixed, default: null },
    targetMember: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
      memberObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
      memberId: { type: mongoose.Schema.Types.Mixed, default: null },
      membershipId: { type: String, default: '' },
      name: { type: String, default: '' },
      business: { type: String, default: '' },
      mobile: { type: String, default: '' },
      email: { type: String, default: '' },
      city: { type: String, default: 'Ahmedabad' },
      address: { type: String, default: '' },
      avatar: { type: String, default: null },
    },

    // Option 2: Complaint Against Another Person (External Non-Member)
    againstPerson: {
      name: { type: String, default: null },
      mobile: { type: String, default: null },
      email: { type: String, default: null },
      gstNumber: { type: String, default: null },
      address: { type: String, default: null },
      company: { type: String, default: null },
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
      incidentDate: { type: String, default: '' },
      incidentTime: { type: String, default: '' },
      location: { type: String, default: 'Ahmedabad' },
      priority: { type: String, default: 'High' },
      proofAvailable: { type: Boolean, default: true },
      amountInvolved: { type: Number, default: 0 },
    },

    // Description Details
    description: {
      issueSummary: { type: String, default: '' },
      detailedDescription: { type: String, default: '' },
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
    member: {
      id: { type: mongoose.Schema.Types.Mixed, default: null },
      _id: { type: mongoose.Schema.Types.Mixed, default: null },
      name: { type: String, default: '' },
      business: { type: String, default: '' },
      mobile: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      gstNumber: { type: String, default: null },
      avatar: { type: String, default: null },
    },
    resolutionNotes: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
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
