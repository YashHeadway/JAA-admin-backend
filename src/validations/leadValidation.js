import { z } from 'zod';

export const leadBaseSchema = z
  .object({
    leadName: z.string().trim().min(2, 'Lead name is required').optional(),
    name: z.string().trim().min(2, 'Lead name is required').optional(),
    businessName: z.string().trim().min(2, 'Business name is required'),
    mobile: z.string().trim().min(8, 'Mobile number is required'),
    email: z.string().trim().email('Valid email is required'),
    businessType: z.string().optional().default('Retailer'),
    gstNumber: z.string().optional().default(''),
    city: z.string().optional().default('Ahmedabad'),
    pincode: z.string().optional().default(''),
    address: z.string().optional().default(''),
    source: z.string().optional().default('Website'),
    status: z.string().optional().default('Newest'),
    description: z.string().optional().default(''),
  })
  .passthrough();

export const createLeadSchema = leadBaseSchema.refine(
  (data) => Boolean(data.leadName || data.name),
  {
    message: 'Lead name is required (provide leadName or name)',
    path: ['leadName'],
  }
);

export const updateLeadSchema = z
  .object({
    leadName: z.string().trim().min(2).optional(),
    name: z.string().trim().min(2).optional(),
    businessName: z.string().trim().min(2).optional(),
    mobile: z.string().trim().min(8).optional(),
    email: z.string().trim().email().optional(),
    businessType: z.string().optional(),
    gstNumber: z.string().optional(),
    city: z.string().optional(),
    pincode: z.string().optional(),
    address: z.string().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();

export const importLeadsSchema = z
  .object({
    leads: z.array(leadBaseSchema.partial()).min(1, 'At least one lead is required for import'),
  })
  .passthrough();
