import { z } from 'zod';

export const COMMITTEE_GENDERS = ['Male', 'Female', 'Other'];
export const COMMITTEE_POSITIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Joint Secretary',
  'Treasurer',
  'Committee Member',
];
export const COMMITTEE_BUSINESS_TYPES = ['B2B', 'B2C'];

export const createCommitteeSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    gender: z.enum(COMMITTEE_GENDERS, {
      errorMap: () => ({ message: "Gender must be 'Male', 'Female', or 'Other'" }),
    }),
    mobile: z.string().trim().min(8, 'Mobile number is required'),
    email: z.string().trim().email('Valid email address is required'),
    address: z.string().trim().min(2, 'Address is required'),
    position: z.enum(COMMITTEE_POSITIONS, {
      errorMap: () => ({
        message:
          "Position must be 'President', 'Vice President', 'Secretary', 'Joint Secretary', 'Treasurer', or 'Committee Member'",
      }),
    }),
    role: z.string().optional().default('Committee Member'),
    businessName: z.string().trim().min(2, 'Business name is required'),
    businessType: z.enum(COMMITTEE_BUSINESS_TYPES, {
      errorMap: () => ({ message: "Business type must be 'B2B' or 'B2C'" }),
    }),
    gstNumber: z.string().optional().default(''),
  });

export const updateCommitteeSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(COMMITTEE_GENDERS).optional(),
    mobile: z.string().trim().min(8).optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().min(2).optional(),
    position: z.enum(COMMITTEE_POSITIONS).optional(),
    role: z.string().optional(),
    businessName: z.string().trim().min(2).optional(),
    businessType: z.enum(COMMITTEE_BUSINESS_TYPES).optional(),
    gstNumber: z.string().optional(),
  });
