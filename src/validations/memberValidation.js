import { z } from 'zod';

const normalizeStatus = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
  z.enum(['pending', 'approved', 'rejected'], {
    errorMap: () => ({ message: "Status must be 'pending', 'approved', or 'rejected'" }),
  })
);

export const idCardValidationSchema = z
  .object({
    cardNumber: z.string().optional(),
    status: z.enum(['active', 'inactive', 'suspended', 'expired']).optional(),
    issuedAt: z.string().optional(),
    validUntil: z.string().nullable().optional(),
    qrCode: z.string().optional(),
  })
  .passthrough();

export const createMemberSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').optional(),
    fullName: z.string().trim().min(2).optional(),
    business: z.string().trim().min(2, 'Business name is required').optional(),
    businessName: z.string().trim().min(2).optional(),
    mobile: z.string().trim().min(8, 'Valid mobile number is required').optional(),
    phone: z.string().trim().min(8).optional(),
    email: z.string().trim().email('Valid email address is required'),
    city: z.string().optional().default('Ahmedabad'),
    dob: z.string().optional(),
    address: z.string().optional(),
    businessType: z.string().optional().default('Retailer'),
    avatar: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    status: normalizeStatus.optional().default('approved'),
    membershipId: z.string().optional(),
    joinedOn: z.string().optional(),
    idCard: idCardValidationSchema.optional(),
    rejectionReason: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
  })
  .passthrough()
  .refine((data) => Boolean(data.name || data.fullName), {
    message: 'Name is required',
    path: ['name'],
  })
  .refine((data) => Boolean(data.business || data.businessName), {
    message: 'Business name is required',
    path: ['business'],
  })
  .refine((data) => Boolean(data.mobile || data.phone), {
    message: 'Valid mobile number is required',
    path: ['mobile'],
  });

export const updateMemberStatusSchema = z
  .object({
    status: normalizeStatus,
    reason: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
  })
  .passthrough();

export const updateMemberSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    business: z.string().trim().min(2).optional(),
    mobile: z.string().trim().min(8).optional(),
    email: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string().trim().email().optional()
    ),
    city: z.string().optional(),
    dob: z.string().optional(),
    address: z.string().optional(),
    businessType: z.string().optional(),
    avatar: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    status: normalizeStatus.optional(),
    reason: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    membershipId: z.string().optional(),
    joinedOn: z.string().optional(),
    idCard: idCardValidationSchema.optional(),
  })
  .passthrough();

