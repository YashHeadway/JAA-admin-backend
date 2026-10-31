import { z } from 'zod';

const emptyToUndefined = (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val);

export const updateAdminProfileSchema = z.object({
  fullName: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  name: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  dateOfBirth: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  dob: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  gender: z.preprocess(
    emptyToUndefined,
    z
      .enum(['Male', 'Female', 'Other'], {
        errorMap: () => ({ message: "Gender must be 'Male', 'Female', or 'Other'" }),
      })
      .optional()
  ),
  mobile: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().email('Invalid email address').optional()
  ),
  address: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  pincode: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  image: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
  profilePhoto: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
  avatar: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
  isActive: z.union([z.boolean(), z.string()]).optional(),
  status: z.string().optional(),
});

