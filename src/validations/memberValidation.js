import { z } from 'zod';

const normalizeStatus = z.preprocess(
  (val) => {
    if (typeof val === 'boolean') return val ? 'active' : 'inactive';
    if (typeof val === 'string') return val.trim().toLowerCase();
    return val;
  },
  z.enum(['active', 'inactive', 'pending', 'approved', 'rejected'], {
    errorMap: () => ({ message: "Status must be 'active', 'inactive', 'pending', 'approved', or 'rejected'" }),
  })
);

export const normalizeIsActive = z.preprocess(
  (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (lower === 'true' || lower === 'active' || lower === 'approved') return true;
      if (lower === 'false' || lower === 'inactive' || lower === 'rejected' || lower === 'pending') return false;
    }
    return val;
  },
  z.boolean().optional()
);

export const normalize10DigitMobile = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'number') return String(val).trim();
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return val;
  },
  z
    .string()
    .regex(/^\d{10}$/, 'Mobile number must be a valid 10-digit number')
    .optional()
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
    mobile: normalize10DigitMobile,
    phone: normalize10DigitMobile,
    email: z.string().trim().email('Valid email address is required'),
    password: z
      .string({ message: 'Password is required and must be at least 6 characters' })
      .trim()
      .min(6, 'Password is required and must be at least 6 characters'),
    confirmPassword: z.string().optional(),
    city: z.string().optional().default('Ahmedabad'),
    dob: z.string().optional(),
    address: z.string().optional(),
    businessType: z.string().optional().default('Retailer'),
    avatar: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    status: normalizeStatus.optional().default('active'),
    isActive: normalizeIsActive.optional().default(true),
    membershipId: z.string().optional(),
    joinedOn: z.string().optional(),
    idCard: idCardValidationSchema.optional(),
    rejectionReason: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    created_by: z.enum(['admin', 'user']).optional(),
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
  .refine((data) => {
    const m = (data.mobile || data.phone || '').toString().trim();
    return Boolean(m && /^\d{10}$/.test(m));
  }, {
    message: 'Mobile number is required and must be a valid 10-digit number',
    path: ['mobile'],
  })
  .refine((data) => {
    if (data.password && data.confirmPassword) {
      return data.password === data.confirmPassword;
    }
    return true;
  }, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateMemberStatusSchema = z
  .object({
    status: normalizeStatus.optional(),
    isActive: normalizeIsActive.optional(),
    reason: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
  })
  .passthrough()
  .refine((data) => data.status !== undefined || data.isActive !== undefined, {
    message: "Either 'status' or 'isActive' must be provided",
    path: ['status'],
  });

export const updateMemberSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    business: z.string().trim().min(2).optional(),
    mobile: normalize10DigitMobile,
    phone: normalize10DigitMobile,
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
    created_by: z.enum(['admin', 'user']).optional(),
    status: normalizeStatus.optional(),
    isActive: normalizeIsActive.optional(),
    reason: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    membershipId: z.string().optional(),
    joinedOn: z.string().optional(),
    idCard: idCardValidationSchema.optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    confirmPassword: z.string().optional(),
  })
  .passthrough()
  .refine((data) => {
    if (data.password && data.confirmPassword) {
      return data.password === data.confirmPassword;
    }
    return true;
  }, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const mobileRegisterMemberSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full Name is required').optional(),
    name: z.string().trim().min(2).optional(),
    businessName: z.string().trim().min(2, 'Business Name is required').optional(),
    business: z.string().trim().min(2).optional(),
    businessType: z.string().optional().default('Retailer'),
    email: z.string().trim().email('Valid email address is required'),
    mobile: normalize10DigitMobile,
    phone: normalize10DigitMobile,
    city: z.string().optional().default('Ahmedabad'),
    password: z
      .string({ message: 'Password is required and must be at least 6 characters' })
      .trim()
      .min(6, 'Password is required and must be at least 6 characters'),
    confirmPassword: z.string().optional(),
    dob: z.string().optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
    avatar: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    created_by: z.enum(['admin', 'user']).optional(),
    status: normalizeStatus.optional().default('pending'),
    isActive: normalizeIsActive.optional().default(false),
  })
  .passthrough()
  .refine((data) => Boolean(data.fullName || data.name), {
    message: 'Full Name is required',
    path: ['fullName'],
  })
  .refine((data) => Boolean(data.businessName || data.business), {
    message: 'Business Name is required',
    path: ['businessName'],
  })
  .refine((data) => {
    const m = (data.mobile || data.phone || '').toString().trim();
    return Boolean(m && /^\d{10}$/.test(m));
  }, {
    message: 'Mobile number is required and must be a valid 10-digit number',
    path: ['mobile'],
  })
  .refine((data) => {
    if (data.password && data.confirmPassword) {
      return data.password === data.confirmPassword;
    }
    return true;
  }, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const memberLoginSchema = z
  .object({
    email: z.string().trim().min(1, 'Email is required').email('Valid email address is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .passthrough();

export const memberForgotPasswordSchema = z
  .object({
    email: z.string().trim().optional(),
    mobile: normalize10DigitMobile,
    phone: normalize10DigitMobile,
  })
  .passthrough()
  .refine((data) => Boolean(data.email || data.mobile || data.phone), {
    message: 'Email or mobile number is required',
    path: ['email'],
  });

export const memberResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
    email: z.string().trim().optional(),
  })
  .passthrough()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match',
    path: ['confirmPassword'],
  });

export const memberChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
    email: z.string().trim().optional(),
  })
  .passthrough()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match',
    path: ['confirmPassword'],
  });

export const updateMemberProfileSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    fullName: z.string().trim().min(2).optional(),
    business: z.string().trim().min(2).optional(),
    businessName: z.string().trim().min(2).optional(),
    city: z.string().optional(),
    dob: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
    businessType: z.string().optional(),
    avatar: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    created_by: z.enum(['admin', 'user']).optional(),
    mobile: normalize10DigitMobile,
    phone: normalize10DigitMobile,
    email: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string().trim().email().optional()
    ),
  })
  .passthrough();


