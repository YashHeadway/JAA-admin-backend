import { z } from 'zod';

export const createComplaintSchema = z.object({
  against: z.string().trim().min(2, 'Against party name is required'),
  againstId: z.string().optional().default('Visitor'),
  againstType: z.enum(['member', 'other']).optional().default('member'),
  type: z.string().trim().min(2, 'Complaint type is required'),
  typeSubtitle: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional().default('Medium'),
  status: z.enum(['New', 'In Progress', 'Under Review', 'Resolved', 'Closed']).optional().default('New'),
  previousInteraction: z.string().optional(),
  preferredResolution: z.string().optional(),
  avatar: z.string().nullable().optional(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(['New', 'In Progress', 'Under Review', 'Resolved', 'Closed']),
});
