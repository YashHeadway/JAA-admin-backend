import { Router } from 'express';
import {
  getAdminProfile,
  getAllAdminProfiles,
  updateAdminProfile,
} from '../controllers/adminProfileController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { updateAdminProfileSchema } from '../validations/adminProfileValidation.js';

const router = Router();

const adminGuard = [authenticate, authorize('Admin', 'Super Admin')];

/**
 * Route: GET /profiles, /profile/all, /profile/list, /all-profiles
 * Fetches all admin profiles.
 */
router.get(
  ['/profiles', '/profile/all', '/profile/list', '/all-profiles'],
  ...adminGuard,
  getAllAdminProfiles
);

/**
 * Route: GET /profile
 * Full endpoint: GET http://localhost:5000/api/admin/profile
 * Fetches currently authenticated admin's profile.
 */
router.get('/profile', ...adminGuard, getAdminProfile);

/**
 * Route: GET /profile/:id
 * Fetches specific admin profile by numeric id or MongoDB _id.
 */
router.get('/profile/:id', ...adminGuard, getAdminProfile);

router.put(
  ['/profile', '/profile/:id'],
  ...adminGuard,
  handleFormData('profilePhoto'),
  validate(updateAdminProfileSchema),
  updateAdminProfile
);

router.patch(
  ['/profile', '/profile/:id'],
  ...adminGuard,
  handleFormData('profilePhoto'),
  validate(updateAdminProfileSchema),
  updateAdminProfile
);

export default router;
