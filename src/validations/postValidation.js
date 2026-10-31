import { z } from 'zod';

const booleanCoerce = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1') return true;
    if (trimmed === 'false' || trimmed === '0') return false;
  }
  if (typeof val === 'boolean') return val;
  if (val === undefined || val === null || val === '') return undefined;
  return val;
}, z.boolean().optional());

const parseJsonIfNeeded = (val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return val;
      }
    }
  }
  return val;
};

const mediaItemSchema = z.object({
  url: z.string().trim().min(1, 'Media URL is required'),
  fileType: z.string().trim().optional(),
});

const adminRefSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    avatar: z.string().nullable().optional(),
  })
  .passthrough();

const memberRefSchema = z
  .object({
    memberId: z.union([z.string(), z.number()]).optional(),
    _id: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    membershipId: z.string().optional(),
    name: z.string().optional(),
    business: z.string().optional(),
    mobile: z.string().optional(),
    avatar: z.string().nullable().optional(),
  })
  .passthrough();

const postedBySchema = z.preprocess(
  parseJsonIfNeeded,
  z.union([
    z
      .object({
        role: z.enum(['admin', 'member']).optional(),
        admin: adminRefSchema.optional(),
        member: memberRefSchema.optional(),
      })
      .passthrough(),
    z.string(),
  ])
);

export const createPostSchema = z
  .object({
    title: z.string().trim().min(2, 'Post title is required'),
    description: z.string().optional().default(''),
    media: z.preprocess(
      parseJsonIfNeeded,
      z.union([
        z.array(z.union([mediaItemSchema, z.string()])),
        mediaItemSchema,
        z.string().min(1, 'Media is required'),
      ])
    ),
    location: z.string().optional().default('Ahmedabad'),
    allowcomments: booleanCoerce,
    allowComments: booleanCoerce,
    ispinned: booleanCoerce,
    isPinned: booleanCoerce,
    status: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
      z.enum(['published', 'draft']).optional().default('published')
    ),
    postedBy: postedBySchema.optional(),
    member: z.preprocess(
      parseJsonIfNeeded,
      z
        .union([memberRefSchema, z.string()])
        .optional()
    ),
    memberId: z.union([z.string(), z.number()]).optional(),
  })
  .transform((data) => {
    const allowComments = data.allowComments ?? data.allowcomments ?? true;
    const isPinned = data.isPinned ?? data.ispinned ?? false;
    const status = (data.status || 'published').toLowerCase();

    return {
      ...data,
      allowComments,
      isPinned,
      status,
    };
  });

export const updatePostSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    description: z.string().optional(),
    media: z.preprocess(
      parseJsonIfNeeded,
      z
        .union([
          z.array(z.union([mediaItemSchema, z.string()])),
          mediaItemSchema,
          z.string(),
        ])
        .optional()
    ),
    location: z.string().optional(),
    allowcomments: booleanCoerce,
    allowComments: booleanCoerce,
    ispinned: booleanCoerce,
    isPinned: booleanCoerce,
    status: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
      z.enum(['published', 'draft']).optional()
    ),
    postedBy: postedBySchema.optional(),
    member: z.preprocess(
      parseJsonIfNeeded,
      z
        .union([memberRefSchema, z.string()])
        .optional()
    ),
    memberId: z.union([z.string(), z.number()]).optional(),
  })
  .transform((data) => {
    const res = { ...data };
    if (data.allowcomments !== undefined || data.allowComments !== undefined) {
      res.allowComments = data.allowComments ?? data.allowcomments;
    }
    if (data.ispinned !== undefined || data.isPinned !== undefined) {
      res.isPinned = data.isPinned ?? data.ispinned;
    }
    if (data.status !== undefined) {
      res.status = data.status.toLowerCase();
    }
    return res;
  });
