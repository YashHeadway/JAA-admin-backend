import { z } from 'zod';

const booleanCoerce = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1') return true;
    if (trimmed === 'false' || trimmed === '0') return false;
  }
  if (typeof val === 'boolean') return val;
  if (val === undefined || val === null || val === '') return true;
  return val;
}, z.boolean());

const emptyToUndefined = (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val);

export const createEventSchema = z
  .object({
    title: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    name: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    eventTitle: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    image: z.preprocess(emptyToUndefined, z.string().optional()),
    startDate: z.preprocess(
      (val) => (val === undefined || val === null ? '' : String(val).trim()),
      z.string().min(1, 'Start date is required')
    ),
    endDate: z.preprocess(
      (val) => (val === undefined || val === null ? '' : String(val).trim()),
      z.string().min(1, 'End date is required')
    ),
    startTime: z.preprocess(
      (val) => (val === undefined || val === null ? '' : String(val).trim()),
      z.string().min(1, 'Start time is required')
    ),
    endTime: z.preprocess(
      (val) => (val === undefined || val === null ? '' : String(val).trim()),
      z.string().min(1, 'End time is required')
    ),
    city: z.preprocess(
      (val) => (val === undefined || val === null || String(val).trim() === '' ? 'Ahmedabad' : String(val).trim()),
      z.string().optional().default('Ahmedabad')
    ),
    address: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    location: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    venue: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    postedBy: z.preprocess(
      (val) => (val === undefined || val === null || String(val).trim() === '' ? 'Admin' : String(val).trim()),
      z.string().optional().default('Admin')
    ),
    description: z.preprocess(
      (val) => (val === undefined || val === null ? '' : String(val).trim()),
      z.string().optional().default('')
    ),
    isActive: booleanCoerce.optional().default(true),
  })
  .transform((data) => {
    const title = data.title || data.name || data.eventTitle || (data.description ? data.description.slice(0, 40) : 'Event');
    const address = data.address || data.location || data.venue || data.city || 'Ahmedabad';
    return {
      ...data,
      title,
      address,
    };
  });

export const updateEventSchema = z
  .object({
    title: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    name: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    eventTitle: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    image: z.preprocess(emptyToUndefined, z.string().optional()),
    startDate: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    endDate: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    startTime: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    endTime: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    city: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    address: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    location: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    venue: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    postedBy: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    description: z.preprocess(emptyToUndefined, z.string().optional()),
    isActive: booleanCoerce.optional(),
  })
  .transform((data) => {
    const result = { ...data };
    if ((data.name || data.eventTitle) && !data.title) {
      result.title = data.title || data.name || data.eventTitle;
    }
    if ((data.location || data.venue) && !data.address) {
      result.address = data.address || data.location || data.venue;
    }
    return result;
  });
