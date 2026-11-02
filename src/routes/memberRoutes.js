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
} from '../controllers/memberController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import {
  createMemberSchema,
  updateMemberStatusSchema,
  updateMemberSchema,
} from '../validations/memberValidation.js';

const router = Router();

// Stats route must precede /:id to prevent route collision
router.get('/stats', getMemberStats);
router.get('/', getMembers);

// ID Card routes (supports both /:id/id-card and /:id/idcard)
router.get('/:id/id-card', getMemberIdCard);
router.get('/:id/idcard', getMemberIdCard);

router.get('/:id', getMemberById);

// Bulk import members
router.post('/bulk', handleFormData(), bulkCreateMembers);
router.post('/import', handleFormData(), bulkCreateMembers);

// Create Member (supports both JSON and form-data with optional avatar)
router.post('/', handleFormData('avatar'), validate(createMemberSchema), createMember);

// Update status specifically
router.patch('/:id/status', handleFormData(), validate(updateMemberStatusSchema), updateMemberStatus);

// General PATCH & PUT member routes (supports both JSON and form-data)
router.patch('/:id', handleFormData('avatar'), validate(updateMemberSchema), updateMember);
router.put('/:id', handleFormData('avatar'), validate(updateMemberSchema), updateMember);

// Delete member
router.delete('/:id', deleteMember);

export default router;
