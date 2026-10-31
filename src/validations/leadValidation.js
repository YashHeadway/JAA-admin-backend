import { z } from 'zod';

export const leadBaseSchema = z
  .object({
    title: z.string().trim().min(2, 'Title is required').optional(),
    leadName: z.string().trim().min(2, 'Lead name is required').optional(),
    name: z.string().trim().min(2, 'Lead name is required').optional(),
    memberId: z.union([z.string(), z.number()]).optional(),
    description: z.string().optional().default(''),
    image: z.string().optional().default(''),
    status: z.string().optional().default('ACTIVE'),

    // Backward-compatible fields
    businessName: z.string().trim().optional(),
    mobile: z.string().trim().optional(),
    email: z.string().trim().email('Valid email is required').optional().or(z.literal('')),
    businessType: z.string().optional().default('Retailer'),
    gstNumber: z.string().optional().default(''),
    city: z.string().optional().default('Ahmedabad'),
    pincode: z.string().optional().default('380009'),
    address: z.string().optional().default(''),
    source: z.string().optional().default('Website'),
  })
  .passthrough();

export const createLeadSchema = leadBaseSchema.refine(
  (data) => Boolean(data.title || data.leadName || data.name),
  {
    message: 'Title is required (provide title, leadName, or name)',
    path: ['title'],
  }
);

export const updateLeadSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    leadName: z.string().trim().min(2).optional(),
    name: z.string().trim().min(2).optional(),
    memberId: z.union([z.string(), z.number()]).optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    status: z.string().optional(),
    businessName: z.string().trim().optional(),
    mobile: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    businessType: z.string().optional(),
    gstNumber: z.string().optional(),
    city: z.string().optional(),
    pincode: z.string().optional(),
    address: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough();

export const importLeadsSchema = z
  .object({
    leads: z.array(leadBaseSchema.partial()).min(1, 'At least one lead is required for import'),
  })
  .passthrough();
