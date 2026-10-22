import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  deleteLead,
  importLeads,
} from '../controllers/leadController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { createLeadSchema, importLeadsSchema } from '../validations/leadValidation.js';

const router = Router();

// /import must precede /:id to prevent route collision
router.post('/import', validate(importLeadsSchema), importLeads);
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', handleFormData(), validate(createLeadSchema), createLead);
router.delete('/:id', deleteLead);

export default router;
