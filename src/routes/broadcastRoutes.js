import { Router } from 'express';
import {
  getBroadcasts,
  getBroadcastById,
  createBroadcast,
  deleteBroadcast,
} from '../controllers/broadcastController.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.get('/', getBroadcasts);
router.get('/:id', getBroadcastById);
router.post('/', handleFormData('attachment'), createBroadcast);
router.delete('/:id', deleteBroadcast);

export default router;
