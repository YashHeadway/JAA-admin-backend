import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { formatDateTime, formatDateOnly } from '../utils/dateFormatter.js';

const idCardSchema = new mongoose.Schema(
  {
    cardNumber: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'expired'],
      default: 'active',
    },
    issuedAt: { type: String, default: '' },
    validUntil: { type: String, default: null },
    qrCode: { type: String, default: '' },
  },
  { _id: false, strict: false }
);

const memberSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    membershipId: { type: String },
    name: { type: String, required: true, trim: true },
    business: { type: String, required: true, trim: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    city: { type: String, default: 'Ahmedabad' },
    dob: { type: String },
    address: { type: String },
    pincode: { type: String, default: '380009' },
    businessType: {
      type: String,
      default: 'Retailer',
    },
    joinedOn: { type: String },
    avatar: { type: String, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'approved', 'rejected'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rejectionReason: { type: String, default: '' },
    idCard: {
      type: idCardSchema,
      default: undefined,
    },
    created_by: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
      default: 'user',
    },
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.country;
        delete ret.createdByUser;
        delete ret.password;

        const cardNum = ret.membershipId || (ret.id ? `JBAD${150 + ret.id}` : '');
        const joinedDate = ret.joinedOn ? formatDateOnly(ret.joinedOn) : formatDateOnly(ret.createdAt || new Date());
        const formattedJoinedOn = ret.joinedOn ? formatDateOnly(ret.joinedOn) : joinedDate;
        const createdAtFormatted = ret.createdAt ? formatDateTime(ret.createdAt) : '';
        const updatedAtFormatted = ret.updatedAt ? formatDateTime(ret.updatedAt) : '';

        const rawStatus = ret.status ? String(ret.status).trim().toLowerCase() : 'active';
        let isMemberActive = true;

        if (ret.isActive !== undefined && ret.isActive !== null) {
          isMemberActive = Boolean(ret.isActive);
        } else if (rawStatus === 'inactive' || rawStatus === 'rejected' || rawStatus === 'pending') {
          isMemberActive = false;
        } else if (rawStatus === 'active' || rawStatus === 'approved') {
          isMemberActive = true;
        }

        const idCard = {
          cardNumber: ret.idCard?.cardNumber || cardNum,
          status: ret.idCard?.status || (isMemberActive ? 'active' : 'inactive'),
          issuedAt: ret.idCard?.issuedAt ? formatDateOnly(ret.idCard.issuedAt) : joinedDate,
          validUntil: ret.idCard?.validUntil || null,
          qrCode: ret.idCard?.qrCode || `https://yourdomain.com/verify/${cardNum}`,
        };

        const ordered = {
          id: ret.id,
          membershipId: ret.membershipId || cardNum,
          name: ret.name,
          business: ret.business,
          mobile: ret.mobile,
          email: ret.email,
          city: ret.city || 'Ahmedabad',
          address: ret.address || '',
          businessType: ret.businessType || 'Retailer',
          joinedOn: formattedJoinedOn,
          avatar: ret.avatar || null,
          isActive: isMemberActive,
          status: rawStatus,
          rejectionReason: ret.rejectionReason || '',
          idCard,
          created_by: ret.created_by || 'user',
          createdAt: createdAtFormatted,
          updatedAt: updatedAtFormatted,
        };

        if (ret.dob) {
          ordered.dob = ret.dob;
        }

        return ordered;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.country;
        delete ret.createdByUser;
        delete ret.password;

        const cardNum = ret.membershipId || (ret.id ? `JBAD${150 + ret.id}` : '');
        const joinedDate = ret.joinedOn ? formatDateOnly(ret.joinedOn) : formatDateOnly(ret.createdAt || new Date());
        const formattedJoinedOn = ret.joinedOn ? formatDateOnly(ret.joinedOn) : joinedDate;
        const createdAtFormatted = ret.createdAt ? formatDateTime(ret.createdAt) : '';
        const updatedAtFormatted = ret.updatedAt ? formatDateTime(ret.updatedAt) : '';

        const rawStatus = ret.status ? String(ret.status).trim().toLowerCase() : 'active';
        let isMemberActive = true;

        if (ret.isActive !== undefined && ret.isActive !== null) {
          isMemberActive = Boolean(ret.isActive);
        } else if (rawStatus === 'inactive' || rawStatus === 'rejected' || rawStatus === 'pending') {
          isMemberActive = false;
        } else if (rawStatus === 'active' || rawStatus === 'approved') {
          isMemberActive = true;
        }

        const idCard = {
          cardNumber: ret.idCard?.cardNumber || cardNum,
          status: ret.idCard?.status || (isMemberActive ? 'active' : 'inactive'),
          issuedAt: ret.idCard?.issuedAt ? formatDateOnly(ret.idCard.issuedAt) : joinedDate,
          validUntil: ret.idCard?.validUntil || null,
          qrCode: ret.idCard?.qrCode || `https://yourdomain.com/verify/${cardNum}`,
        };

        const ordered = {
          id: ret.id,
          membershipId: ret.membershipId || cardNum,
          name: ret.name,
          business: ret.business,
          mobile: ret.mobile,
          email: ret.email,
          city: ret.city || 'Ahmedabad',
          address: ret.address || '',
          businessType: ret.businessType || 'Retailer',
          joinedOn: formattedJoinedOn,
          avatar: ret.avatar || null,
          isActive: isMemberActive,
          status: rawStatus,
          rejectionReason: ret.rejectionReason || '',
          idCard,
          created_by: ret.created_by || 'user',
          createdAt: createdAtFormatted,
          updatedAt: updatedAtFormatted,
        };

        if (ret.dob) {
          ordered.dob = ret.dob;
        }

        return ordered;
      },
    },
  }
);

memberSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  if (!this.membershipId && this.id) {
    this.membershipId = `JBAD${150 + this.id}`;
  }
  const cardNum = this.membershipId || (this.id ? `JBAD${150 + this.id}` : '');
  const issuedDate = this.joinedOn ? formatDateOnly(this.joinedOn) : formatDateOnly(this.createdAt || new Date());

  const isCardActive = !(this.status === 'rejected' || this.status === 'inactive' || this.isActive === false);

  if (!this.idCard || !this.idCard.cardNumber) {
    this.idCard = {
      cardNumber: cardNum,
      status: isCardActive ? 'active' : 'inactive',
      issuedAt: issuedDate,
      validUntil: this.idCard?.validUntil || null,
      qrCode: `https://yourdomain.com/verify/${cardNum}`,
    };
  } else {
    if (cardNum && this.idCard.cardNumber !== cardNum) {
      this.idCard.cardNumber = cardNum;
      this.idCard.qrCode = `https://yourdomain.com/verify/${cardNum}`;
    }
    if (!this.idCard.issuedAt) {
      this.idCard.issuedAt = issuedDate;
    }
  }
});

export const Member = mongoose.models.Member || mongoose.model('Member', memberSchema);
