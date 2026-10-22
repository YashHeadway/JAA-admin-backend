import { Router } from 'express';
import {
  getComplaints,
  getComplaintById,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
} from '../controllers/complaintController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { createComplaintSchema, updateComplaintStatusSchema } from '../validations/complaintValidation.js';

const router = Router();

router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.post('/', handleFormData('avatar'), validate(createComplaintSchema), createComplaint);
router.patch('/:id/status', handleFormData(), validate(updateComplaintStatusSchema), updateComplaintStatus);
router.patch('/:id', handleFormData('avatar'), validate(updateComplaintStatusSchema.partial()), updateComplaintStatus);
router.delete('/:id', deleteComplaint);

export default router;
