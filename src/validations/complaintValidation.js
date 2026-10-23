import { z } from 'zod';

const emptyToUndefined = (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val);

const parseJsonIfNeeded = (val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

const parseBoolean = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val;
};

const parseNumber = (val) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val.replace(/[^0-9.-]+/g, ''));
    if (!isNaN(num)) return num;
  }
  return val;
};

export const complaintBySchema = z.object({
  memberId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  name: z.preprocess(emptyToUndefined, z.string().optional()),
  business: z.preprocess(emptyToUndefined, z.string().optional()),
  mobile: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.string().optional()),
  avatar: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
});

export const complaintDetailsSchema = z.object({
  incidentDate: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  incidentTime: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  location: z.preprocess(emptyToUndefined, z.string().optional().default('Ahmedabad')),
  priority: z.preprocess(emptyToUndefined, z.enum(['Low', 'Medium', 'High']).optional().default('High')),
  proofAvailable: z.preprocess(parseBoolean, z.boolean().optional().default(true)),
  amountInvolved: z.preprocess(parseNumber, z.number().optional().default(0)),
});

export const complaintDescriptionSchema = z.object({
  issueSummary: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  detailedDescription: z.preprocess(emptyToUndefined, z.string().optional().default('')),
});

export const mediaItemSchema = z.object({
  url: z.string().trim().min(1, 'Media URL is required'),
  type: z.string().trim().optional().default('Photo'),
});

export const createComplaintSchema = z.object({
  complaintAgainst: z.preprocess(emptyToUndefined, z.string().optional().default('Member')),
  complaintBy: z.preprocess(parseJsonIfNeeded, complaintBySchema.optional()),

  targetMemberId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  memberId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  member: z.preprocess(
    parseJsonIfNeeded,
    z.object({
      id: z.union([z.number(), z.string()]).optional(),
      name: z.string().optional(),
    }).optional()
  ),

  complaintType: z.preprocess(
    emptyToUndefined,
    z.string().optional().default('Payment Dispute')
  ),
  priority: z.preprocess(emptyToUndefined, z.enum(['Low', 'Medium', 'High']).optional().default('High')),
  status: z.preprocess(emptyToUndefined, z.string().optional().default('Open')),
  hasPreviousInteraction: z.preprocess(parseBoolean, z.boolean().optional().default(false)),
  preferredResolution: z.preprocess(emptyToUndefined, z.string().optional().default('Requesting immediate payment of pending amount.')),

  complaintDetails: z.preprocess(parseJsonIfNeeded, complaintDetailsSchema).optional().default({}),
  description: z.preprocess(parseJsonIfNeeded, complaintDescriptionSchema).optional().default({}),
  media: z.preprocess(
    (val) => {
      const parsed = parseJsonIfNeeded(val);
      if (!parsed) return [];
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') return [{ url: parsed, type: 'Photo' }];
      if (typeof parsed === 'object') return [parsed];
      return [];
    },
    z.array(mediaItemSchema).optional().default([])
  ),

  resolutionNotes: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  adminAction: z.preprocess(parseJsonIfNeeded, z.any().optional()),
  updatedBy: z.any().optional(),
});

export const updateComplaintSchema = z.object({
  complaintAgainst: z.preprocess(emptyToUndefined, z.string().optional()),
  complaintBy: z.preprocess(parseJsonIfNeeded, complaintBySchema.partial().optional()),
  targetMemberId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  memberId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  member: z.preprocess(
    parseJsonIfNeeded,
    z.object({
      id: z.union([z.number(), z.string()]).optional(),
      name: z.string().optional(),
    }).optional()
  ),
  complaintType: z.preprocess(emptyToUndefined, z.string().optional()),
  hasPreviousInteraction: z.preprocess(parseBoolean, z.boolean().optional()),
  preferredResolution: z.preprocess(emptyToUndefined, z.string().optional()),

  complaintDetails: z.preprocess(parseJsonIfNeeded, complaintDetailsSchema.partial()).optional(),
  description: z.preprocess(parseJsonIfNeeded, complaintDescriptionSchema.partial()).optional(),
  media: z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      const parsed = parseJsonIfNeeded(val);
      if (!parsed) return [];
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') return [{ url: parsed, type: 'Photo' }];
      if (typeof parsed === 'object') return [parsed];
      return [];
    },
    z.array(mediaItemSchema).optional()
  ),

  status: z.preprocess(emptyToUndefined, z.string().optional()),
  priority: z.preprocess(emptyToUndefined, z.enum(['Low', 'Medium', 'High']).optional()),
  resolutionNotes: z.preprocess(emptyToUndefined, z.string().optional()),
  adminRemarks: z.preprocess(emptyToUndefined, z.string().optional()),
  adminAction: z.preprocess(parseJsonIfNeeded, z.any().optional()),
  updatedBy: z.any().optional(),
});

// Alias for backwards compatibility
export const updateComplaintStatusSchema = updateComplaintSchema;
