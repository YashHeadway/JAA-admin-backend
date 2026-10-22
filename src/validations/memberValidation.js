import { z } from 'zod';

export const createMemberSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  business: z.string().trim().min(2, 'Business name is required'),
  mobile: z.string().trim().min(8, 'Valid mobile number is required'),
  email: z.string().trim().email('Valid email address is required'),
  city: z.string().optional().default('Ahmedabad'),
  dob: z.string().optional(),
  address: z.string().optional(),
  businessType: z.string().optional().default('Retailer'),
  avatar: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
});

export const updateMemberStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'], {
    errorMap: () => ({ message: "Status must be 'pending', 'approved', or 'rejected'" }),
  }),
  reason: z.string().optional(),
});

export const updateMemberSchema = z.object({
  name: z.string().trim().min(2).optional(),
  business: z.string().trim().min(2).optional(),
  mobile: z.string().trim().min(8).optional(),
  email: z.string().trim().email().optional(),
  city: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  businessType: z.string().optional(),
  avatar: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  reason: z.string().optional(),
  rejectionReason: z.string().optional(),
});
