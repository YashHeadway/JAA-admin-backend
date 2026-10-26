import { z } from 'zod';

const preprocessMembers = (val) => {
  if (val === undefined || val === null || val === '') return [];

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            if (typeof item === 'number' || typeof item === 'string') {
              return { memberId: Number(item) };
            }
            return item;
          });
        }
        if (typeof parsed === 'object' && parsed !== null) {
          return [parsed];
        }
      } catch {
        // Fallback below
      }
    }

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ memberId: Number(s) }));
    }

    if (!isNaN(Number(trimmed))) {
      return [{ memberId: Number(trimmed) }];
    }

    return [{ memberId: trimmed }];
  }

  if (typeof val === 'number') {
    return [{ memberId: val }];
  }

  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === 'number' || typeof item === 'string') {
        return { memberId: Number(item) };
      }
      return item;
    });
  }

  if (typeof val === 'object' && val !== null) {
    return [val];
  }

  return val;
};

const normalizeCommitteeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };

  const hasMembers =
    clone.members !== undefined &&
    clone.members !== null &&
    clone.members !== '' &&
    !(Array.isArray(clone.members) && clone.members.length === 0);

  if (!hasMembers) {
    if (clone.memberId !== undefined && clone.memberId !== null && clone.memberId !== '') {
      clone.members = clone.memberId;
    } else if (clone.memberIds !== undefined && clone.memberIds !== null && clone.memberIds !== '') {
      clone.members = clone.memberIds;
    }
  }

  return clone;
};

const memberItemSchema = z
  .object({
    memberId: z.coerce.number({
      required_error: 'memberId is required',
      invalid_type_error: 'memberId must be a valid number',
    }),
    name: z.string().trim().optional(),
  })
  .passthrough();

const baseCreateCommitteeSchema = z
  .object({
    position: z.string().trim().min(1, 'Position is required'),
    memberId: z.union([z.number(), z.string(), z.array(z.union([z.number(), z.string()]))]).optional(),
    memberIds: z.union([z.number(), z.string(), z.array(z.union([z.number(), z.string()]))]).optional(),
    members: z.preprocess(preprocessMembers, z.array(memberItemSchema).optional().default([])),
    fullName: z.string().trim().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    role: z.string().optional(),
    businessName: z.string().optional(),
    businessType: z.string().optional(),
    gstNumber: z.string().optional(),
  })
  .passthrough();

export const createCommitteeSchema = z.preprocess(normalizeCommitteeBody, baseCreateCommitteeSchema);

const baseUpdateCommitteeSchema = z
  .object({
    position: z.string().trim().min(1).optional(),
    memberId: z.union([z.number(), z.string(), z.array(z.union([z.number(), z.string()]))]).optional(),
    memberIds: z.union([z.number(), z.string(), z.array(z.union([z.number(), z.string()]))]).optional(),
    members: z.preprocess(preprocessMembers, z.array(memberItemSchema).optional()),
    addMembers: z.preprocess(preprocessMembers, z.array(memberItemSchema).optional()),
    fullName: z.string().trim().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    role: z.string().optional(),
    businessName: z.string().optional(),
    businessType: z.string().optional(),
    gstNumber: z.string().optional(),
  })
  .passthrough();

export const updateCommitteeSchema = z.preprocess(normalizeCommitteeBody, baseUpdateCommitteeSchema);
