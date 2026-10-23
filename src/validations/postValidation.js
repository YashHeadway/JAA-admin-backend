import { z } from 'zod';

const booleanCoerce = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val;
}, z.boolean());

export const createPostSchema = z
  .object({
    title: z.string().trim().min(2, 'Post title is required'),
    description: z.string().optional().default(''),
    media: z.string().min(1, 'Media is required'),
    mediaType: z.enum(['Photo', 'Video', 'Notice']).optional(),
    location: z.string().optional().default('Ahmedabad'),
    allowComments: booleanCoerce.optional().default(true),
    isPinned: booleanCoerce.optional().default(false),
  });

export const updatePostSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    description: z.string().optional(),
    media: z.string().optional(),
    mediaType: z.enum(['Photo', 'Video', 'Notice']).optional(),
    location: z.string().optional(),
    allowComments: booleanCoerce.optional(),
    isPinned: booleanCoerce.optional(),
  });
