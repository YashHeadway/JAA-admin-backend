import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().trim().min(2, 'Post title is required'),
  subtitle: z.string().optional(),
  type: z.enum(['Photo', 'Video', 'Notice']).optional().default('Photo'),
  category: z.string().optional(),
  description: z.string().optional(),
  postedBy: z.string().optional(),
  authorEmail: z.string().email().optional(),
  authorAvatar: z.string().optional(),
  postThumbnail: z.string().nullable().optional(),
  mainMedia: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  gallery: z.array(z.string()).optional(),
  allowComments: z.boolean().optional().default(true),
  isPinned: z.boolean().optional().default(false),
  location: z.string().optional().default('Ahmedabad, Gujarat'),
});
