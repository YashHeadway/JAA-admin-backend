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

// Middleware sequence: Authentication -> Admin Authorization -> Controller
const adminAuthGuard = [authenticate, authorize('Admin', 'Super Admin')];

// All admin profiles endpoints
router.get(
  ['/all', '/profile/all', '/list', '/profile/list', '/profiles'],
  ...adminAuthGuard,
  getAllAdminProfiles
);

// Single profile endpoints (authenticated user's profile)
router.get(['/', '/profile'], ...adminAuthGuard, getAdminProfile);

// Specific profile endpoint by ID or MongoDB _id
router.get(['/:id', '/profile/:id'], ...adminAuthGuard, getAdminProfile);

// Update endpoints
router
  .route(['/', '/profile', '/:id', '/profile/:id'])
  .put(...adminAuthGuard, handleFormData(['image', 'profilePhoto', 'avatar']), validate(updateAdminProfileSchema), updateAdminProfile)
  .patch(...adminAuthGuard, handleFormData(['image', 'profilePhoto', 'avatar']), validate(updateAdminProfileSchema), updateAdminProfile)
  .post(...adminAuthGuard, handleFormData(['image', 'profilePhoto', 'avatar']), validate(updateAdminProfileSchema), updateAdminProfile);

// Alias update paths
router
  .route(['/update-profile', '/updateProfile', '/admin-update-profile', '/adminUpdateProfile'])
  .post(...adminAuthGuard, handleFormData(['image', 'profilePhoto', 'avatar']), validate(updateAdminProfileSchema), updateAdminProfile)
  .put(...adminAuthGuard, handleFormData(['image', 'profilePhoto', 'avatar']), validate(updateAdminProfileSchema), updateAdminProfile)
  .patch(...adminAuthGuard, handleFormData(['image', 'profilePhoto', 'avatar']), validate(updateAdminProfileSchema), updateAdminProfile);

export default router;
