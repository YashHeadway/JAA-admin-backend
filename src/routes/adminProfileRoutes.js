import { Router } from 'express';
import { getAdminProfile, updateAdminProfile } from '../controllers/adminProfileController.js';
import { authenticateOptional } from '../middlewares/authMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { updateAdminProfileSchema } from '../validations/adminProfileValidation.js';

const router = Router();

// Support both /api/admin-profile and /api/admin-profile/:id (e.g. /api/admin-profile/1)
router
  .route('/')
  .get(authenticateOptional, getAdminProfile)
  .put(authenticateOptional, handleFormData('profilePhoto'), validate(updateAdminProfileSchema), updateAdminProfile)
  .patch(authenticateOptional, handleFormData('profilePhoto'), validate(updateAdminProfileSchema), updateAdminProfile)
  .post(authenticateOptional, handleFormData('profilePhoto'), validate(updateAdminProfileSchema), updateAdminProfile);

router
  .route('/:id')
  .get(authenticateOptional, getAdminProfile)
  .put(authenticateOptional, handleFormData('profilePhoto'), validate(updateAdminProfileSchema), updateAdminProfile)
  .patch(authenticateOptional, handleFormData('profilePhoto'), validate(updateAdminProfileSchema), updateAdminProfile)
  .post(authenticateOptional, handleFormData('profilePhoto'), validate(updateAdminProfileSchema), updateAdminProfile);

export default router;
