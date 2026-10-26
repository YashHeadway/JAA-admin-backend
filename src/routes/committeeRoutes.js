import { Router } from 'express';
import {
  getCommittee,
  getCommitteeById,
  createCommittee,
  updateCommittee,
  deleteCommittee,
} from '../controllers/committeeController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import {
  createCommitteeSchema,
  updateCommitteeSchema,
} from '../validations/committeeValidation.js';

const router = Router();

router.get('/', getCommittee);
router.get('/:id', getCommitteeById);
router.post('/', handleFormData(), validate(createCommitteeSchema), createCommittee);

// Update committee (supports PUT, PATCH, and POST with :id or /update/:id)
router.put(['/:id', '/update/:id'], handleFormData(), validate(updateCommitteeSchema), updateCommittee);
router.patch(['/:id', '/update/:id'], handleFormData(), validate(updateCommitteeSchema), updateCommittee);
router.post(['/:id', '/update/:id'], handleFormData(), validate(updateCommitteeSchema), updateCommittee);

router.delete('/:id', deleteCommittee);

export default router;
