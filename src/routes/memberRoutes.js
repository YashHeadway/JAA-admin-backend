import { Router } from 'express';
import {
  getMembers,
  getMemberStats,
  getMemberById,
  getMemberIdCard,
  updateMemberStatus,
  updateMember,
  deleteMember,
  createMember,
  bulkCreateMembers,
  registerMobileMember,
  getMemberProfile,
  updateMemberProfile,
} from '../controllers/memberController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { authenticate, authenticateOptional, protectAdmin } from '../middlewares/authMiddleware.js';
import {
  createMemberSchema,
  updateMemberStatusSchema,
  updateMemberSchema,
  mobileRegisterMemberSchema,
  updateMemberProfileSchema,
} from '../validations/memberValidation.js';

const router = Router();

// Stats route must precede /:id to prevent route collision
router.get('/stats', protectAdmin, getMemberStats);

// Mobile App: Member own profile routes (MUST precede /:id)
router.get('/profile', authenticate, getMemberProfile);
router.patch('/profile', authenticate, handleFormData('avatar'), validate(updateMemberProfileSchema), updateMemberProfile);
router.put('/profile', authenticate, handleFormData('avatar'), validate(updateMemberProfileSchema), updateMemberProfile);

// Mobile App: Member self-registration route (public or optional auth to link user ID)
router.post('/register', authenticateOptional, handleFormData('avatar'), validate(mobileRegisterMemberSchema), registerMobileMember);

// Protected Admin Member routes
router.get('/', protectAdmin, getMembers);

// ID Card routes (supports both /:id/id-card and /:id/idcard)
router.get('/:id/id-card', protectAdmin, getMemberIdCard);
router.get('/:id/idcard', protectAdmin, getMemberIdCard);

router.get('/:id', protectAdmin, getMemberById);

// Bulk import members
router.post('/bulk', protectAdmin, handleFormData(), bulkCreateMembers);
router.post('/import', protectAdmin, handleFormData(), bulkCreateMembers);

// Create Member (Admin creates member: supports both JSON and form-data with optional avatar)
router.post('/', protectAdmin, handleFormData('avatar'), validate(createMemberSchema), createMember);

// Update status specifically
router.patch('/:id/status', protectAdmin, handleFormData(), validate(updateMemberStatusSchema), updateMemberStatus);

// General PATCH & PUT member routes (supports both JSON and form-data)
router.patch('/:id', protectAdmin, handleFormData('avatar'), validate(updateMemberSchema), updateMember);
router.put('/:id', protectAdmin, handleFormData('avatar'), validate(updateMemberSchema), updateMember);

// Delete member
router.delete('/:id', protectAdmin, deleteMember);

export default router;
