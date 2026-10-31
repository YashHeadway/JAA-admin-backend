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
    const lower = val.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
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
  _id: z.preprocess(emptyToUndefined, z.string().optional()),
  memberObjectId: z.preprocess(emptyToUndefined, z.string().optional()),
  memberId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  id: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  membershipId: z.preprocess(emptyToUndefined, z.string().optional()),
  name: z.preprocess(emptyToUndefined, z.string().optional()),
  business: z.preprocess(emptyToUndefined, z.string().optional()),
  mobile: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.string().optional()),
  city: z.preprocess(emptyToUndefined, z.string().optional()),
  address: z.preprocess(emptyToUndefined, z.string().optional()),
  avatar: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
});

export const againstPersonSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().trim().min(1, 'Person name is required')),
  mobile: z.preprocess(emptyToUndefined, z.string().trim().min(1, 'Person mobile number is required')),
  mobileNumber: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  email: z.preprocess(emptyToUndefined, z.string().trim().nullable().optional()),
  gstNumber: z.preprocess(emptyToUndefined, z.string().trim().nullable().optional()),
  gst: z.preprocess(emptyToUndefined, z.string().trim().nullable().optional()),
  address: z.preprocess(emptyToUndefined, z.string().trim().nullable().optional()),
  company: z.preprocess(emptyToUndefined, z.string().trim().nullable().optional()),
  business: z.preprocess(emptyToUndefined, z.string().trim().nullable().optional()),
  firmName: z.preprocess(emptyToUndefined, z.string().trim().nullable().optional()),
}).transform((data) => ({
  name: data.name,
  mobile: data.mobile || data.mobileNumber || data.phone,
  email: data.email || null,
  gstNumber: data.gstNumber || data.gst || null,
  address: data.address || null,
  company: data.company || data.business || data.firmName || null,
}));

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

const parseMedia = (val) => {
  const parsed = parseJsonIfNeeded(val);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed.map((m) => (typeof m === 'string' ? { url: m, type: 'Photo' } : m));
  }
  if (typeof parsed === 'string' && parsed.trim()) return [{ url: parsed.trim(), type: 'Photo' }];
  if (typeof parsed === 'object') return [parsed];
  return [];
};

export const createComplaintSchema = z
  .object({
    complaintAgainst: z.preprocess(
      (val) => {
        if (!val || typeof val !== 'string') return 'Member';
        const lower = val.trim().toLowerCase();
        if (lower === 'other' || lower === 'person' || lower === 'non-member') return 'Other';
        return 'Member';
      },
      z.enum(['Member', 'Other']).default('Member')
    ),

    // Complainant (Option 1 & 2)
    complaintBy: z.preprocess(parseJsonIfNeeded, complaintBySchema.optional()),
    complainantId: z.preprocess(emptyToUndefined, z.union([z.number(), z.string()]).optional()),
    complainantObjectId: z.preprocess(emptyToUndefined, z.string().optional()),

    // Target Member (Option 1)
    targetMemberId: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
      },
      z.union([z.number(), z.string()]).nullable().optional()
    ),
    targetMemberObjectId: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
    againstMemberId: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
      },
      z.union([z.number(), z.string()]).nullable().optional()
    ),
    targetMember: z.preprocess(parseJsonIfNeeded, z.any().optional()),
    memberId: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
      },
      z.union([z.number(), z.string()]).nullable().optional()
    ),
    member: z.preprocess(parseJsonIfNeeded, z.any().optional()),

    // Against Person (Option 2)
    againstPerson: z.preprocess(parseJsonIfNeeded, z.any().optional()),
    complaintPerson: z.preprocess(parseJsonIfNeeded, z.any().optional()),
    person: z.preprocess(parseJsonIfNeeded, z.any().optional()),

    // Optional top-level person fields for direct JSON or form-data
    name: z.preprocess(emptyToUndefined, z.string().optional()),
    mobile: z.preprocess(emptyToUndefined, z.string().optional()),
    mobileNumber: z.preprocess(emptyToUndefined, z.string().optional()),
    phone: z.preprocess(emptyToUndefined, z.string().optional()),
    email: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
    gstNumber: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
    gst: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
    address: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
    company: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
    business: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
    firmName: z.preprocess(emptyToUndefined, z.string().nullable().optional()),

    // Core complaint fields
    complaintType: z.preprocess(emptyToUndefined, z.string().optional().default('Payment Dispute')),
    priority: z.preprocess(emptyToUndefined, z.enum(['Low', 'Medium', 'High']).optional().default('High')),
    status: z.preprocess(emptyToUndefined, z.string().optional().default('Open')),
    hasPreviousInteraction: z.preprocess(parseBoolean, z.boolean().optional().default(false)),
    preferredResolution: z.preprocess(emptyToUndefined, z.string().optional().default('Requesting immediate payment of pending amount.')),

    complaintDetails: z.preprocess(parseJsonIfNeeded, complaintDetailsSchema).optional().default({}),
    description: z.preprocess(parseJsonIfNeeded, complaintDescriptionSchema).optional().default({}),
    media: z.preprocess(parseMedia, z.array(mediaItemSchema).optional().default([])),

    resolutionNotes: z.preprocess(emptyToUndefined, z.string().optional().default('')),
    adminAction: z.preprocess(parseJsonIfNeeded, z.any().optional()),
    updatedBy: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    // If complaint is against another person, name and mobile number are required
    if (data.complaintAgainst === 'Other') {
      const p = data.againstPerson || data.complaintPerson || data.person || {};
      const personName = (p.name || data.name || '').trim();
      const personMobile = (p.mobile || p.mobileNumber || p.phone || data.mobile || data.mobileNumber || data.phone || '').trim();

      if (!personName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Person name is required',
          path: ['againstPerson', 'name'],
        });
      }
      if (!personMobile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Person mobile number is required',
          path: ['againstPerson', 'mobile'],
        });
      }
    }
  });

export const updateComplaintSchema = z.object({
  complaintAgainst: z.preprocess(
    (val) => {
      if (!val || typeof val !== 'string') return undefined;
      const lower = val.trim().toLowerCase();
      if (lower === 'other' || lower === 'person' || lower === 'non-member') return 'Other';
      return 'Member';
    },
    z.enum(['Member', 'Other']).optional()
  ),
  complaintBy: z.preprocess(parseJsonIfNeeded, complaintBySchema.partial().optional()),
  targetMemberId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.union([z.number(), z.string()]).nullable().optional()
  ),
  targetMemberObjectId: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
  againstPerson: z.preprocess(parseJsonIfNeeded, z.any().optional()),
  complaintType: z.preprocess(emptyToUndefined, z.string().optional()),
  hasPreviousInteraction: z.preprocess(parseBoolean, z.boolean().optional()),
  preferredResolution: z.preprocess(emptyToUndefined, z.string().optional()),

  complaintDetails: z.preprocess(parseJsonIfNeeded, complaintDetailsSchema.partial()).optional(),
  description: z.preprocess(parseJsonIfNeeded, complaintDescriptionSchema.partial()).optional(),
  media: z.preprocess(parseMedia, z.array(mediaItemSchema).optional()),

  status: z.preprocess(emptyToUndefined, z.string().optional()),
  priority: z.preprocess(emptyToUndefined, z.enum(['Low', 'Medium', 'High']).optional()),
  resolutionNotes: z.preprocess(emptyToUndefined, z.string().optional()),
  adminRemarks: z.preprocess(emptyToUndefined, z.string().optional()),
  adminAction: z.preprocess(parseJsonIfNeeded, z.any().optional()),
  updatedBy: z.any().optional(),
});

export const updateComplaintStatusSchema = updateComplaintSchema;
