import mongoose from 'mongoose';
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
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },
    idCard: {
      type: idCardSchema,
      default: undefined,
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

        const cardNum = ret.membershipId || (ret.id ? `JBAD${150 + ret.id}` : '');
        const joinedDate = ret.joinedOn ? formatDateOnly(ret.joinedOn) : formatDateOnly(ret.createdAt || new Date());
        const formattedJoinedOn = ret.joinedOn ? formatDateOnly(ret.joinedOn) : joinedDate;
        const createdAtFormatted = ret.createdAt ? formatDateTime(ret.createdAt) : '';
        const updatedAtFormatted = ret.updatedAt ? formatDateTime(ret.updatedAt) : '';

        const idCard = {
          cardNumber: ret.idCard?.cardNumber || cardNum,
          status: ret.idCard?.status || (ret.status === 'rejected' ? 'inactive' : 'active'),
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
          status: ret.status,
          rejectionReason: ret.rejectionReason || '',
          idCard,
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

        const cardNum = ret.membershipId || (ret.id ? `JBAD${150 + ret.id}` : '');
        const joinedDate = ret.joinedOn ? formatDateOnly(ret.joinedOn) : formatDateOnly(ret.createdAt || new Date());
        const formattedJoinedOn = ret.joinedOn ? formatDateOnly(ret.joinedOn) : joinedDate;
        const createdAtFormatted = ret.createdAt ? formatDateTime(ret.createdAt) : '';
        const updatedAtFormatted = ret.updatedAt ? formatDateTime(ret.updatedAt) : '';

        const idCard = {
          cardNumber: ret.idCard?.cardNumber || cardNum,
          status: ret.idCard?.status || (ret.status === 'rejected' ? 'inactive' : 'active'),
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
          status: ret.status,
          rejectionReason: ret.rejectionReason || '',
          idCard,
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

memberSchema.pre('save', function () {
  if (!this.membershipId && this.id) {
    this.membershipId = `JBAD${150 + this.id}`;
  }
  const cardNum = this.membershipId || (this.id ? `JBAD${150 + this.id}` : '');
  const issuedDate = this.joinedOn ? formatDateOnly(this.joinedOn) : formatDateOnly(this.createdAt || new Date());

  if (!this.idCard || !this.idCard.cardNumber) {
    this.idCard = {
      cardNumber: cardNum,
      status: this.status === 'rejected' ? 'inactive' : 'active',
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
