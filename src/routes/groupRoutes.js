import { Router } from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  toggleGroupStatus,
  deleteGroup,
} from '../controllers/groupController.js';

const router = Router();

router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.patch('/:id/status', toggleGroupStatus);
router.delete('/:id', deleteGroup);

export default router;
