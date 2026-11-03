import { Router } from 'express';
import {
  getGroups,
  getGroupById,
  getMembersForSelect,
  createGroup,
  updateGroup,
  toggleGroupStatus,
  addMembersToGroup,
  removeMemberFromGroup,
  sendGroupBroadcast,
  deleteGroup,
} from '../controllers/groupController.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';

const router = Router();

// Member selection for Create Group (Image 2)
router.get('/members', getMembersForSelect);

router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/', handleFormData('file'), createGroup);
router.put('/:id', handleFormData('file'), updateGroup);
router.patch('/:id', handleFormData('file'), updateGroup);
router.patch('/:id/status', toggleGroupStatus);
router.put('/:id/status', toggleGroupStatus);

// Group Actions (as shown in Image 2)
router.post('/:id/members', handleFormData('file'), addMembersToGroup);
router.delete('/:id/members/:memberId', removeMemberFromGroup);
router.post('/:id/broadcast', handleFormData('attachment'), sendGroupBroadcast);

router.delete('/:id', deleteGroup);

export default router;
