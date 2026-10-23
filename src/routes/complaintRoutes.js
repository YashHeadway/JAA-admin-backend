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
import { createComplaintSchema, updateComplaintSchema } from '../validations/complaintValidation.js';

const router = Router();

router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.post('/', handleFormData('media'), validate(createComplaintSchema), createComplaint);
router.patch('/:id/status', handleFormData(), validate(updateComplaintSchema), updateComplaintStatus);
router.patch('/:id', handleFormData('media'), validate(updateComplaintSchema), updateComplaintStatus);
router.put('/:id', handleFormData('media'), validate(updateComplaintSchema), updateComplaintStatus);
router.delete('/:id', deleteComplaint);

export default router;
