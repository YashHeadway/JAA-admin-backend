import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').optional(),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['Admin', 'Super Admin', 'Committee Member', 'Member']).optional(),
  mobile: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  avatar: z.string().optional(),
});

export const adminAuthSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Password reset token is required'),
  newPassword: z.string().min(1, 'New password is required'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
});


