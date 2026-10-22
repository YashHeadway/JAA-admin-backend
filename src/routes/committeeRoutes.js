import { Router } from 'express';
import {
  getCommittee,
  getCommitteeById,
  createCommittee,
  updateCommittee,
  deleteCommittee,
} from '../controllers/committeeController.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.get('/', getCommittee);
router.get('/:id', getCommitteeById);
router.post('/', handleFormData('avatar'), createCommittee);
router.put('/:id', handleFormData('avatar'), updateCommittee);
router.patch('/:id', handleFormData('avatar'), updateCommittee);
router.delete('/:id', deleteCommittee);

export default router;
