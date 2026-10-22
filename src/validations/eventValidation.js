import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().trim().min(3, 'Event title is required'),
  image: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  city: z.string().optional().default('Ahmedabad'),
  address: z.string().min(5, 'Address is required'),
  postedBy: z.string().optional().default('Admin'),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateEventSchema = createEventSchema.partial();
