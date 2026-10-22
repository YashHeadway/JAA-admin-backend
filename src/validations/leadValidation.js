import { z } from 'zod';

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, 'Lead name is required'),
  businessName: z.string().trim().min(2, 'Business name is required'),
  mobile: z.string().trim().min(8, 'Mobile number is required'),
  email: z.string().trim().email('Valid email is required'),
  businessType: z.string().optional().default('Retailer'),
  gstNumber: z.string().optional(),
  city: z.string().optional().default('Ahmedabad'),
  pincode: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional().default('Website'),
  status: z.string().optional().default('Newest'),
  description: z.string().optional(),
});

export const importLeadsSchema = z.object({
  leads: z.array(createLeadSchema.partial()).min(1, 'At least one lead is required for import'),
});
