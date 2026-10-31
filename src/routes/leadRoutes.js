import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  importLeads,
} from '../controllers/leadController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import {
  createLeadSchema,
  updateLeadSchema,
  importLeadsSchema,
} from '../validations/leadValidation.js';

const router = Router();

// /import must precede /:id to prevent route collision
router.post('/import', validate(importLeadsSchema), importLeads);
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', handleFormData('image'), validate(createLeadSchema), createLead);
router.patch('/:id', handleFormData('image'), validate(updateLeadSchema), updateLead);
router.put('/:id', handleFormData('image'), validate(updateLeadSchema), updateLead);
router.delete('/:id', deleteLead);

export default router;
