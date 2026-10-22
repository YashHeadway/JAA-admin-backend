import { Router } from 'express';
import { getBroadcasts, createBroadcast } from '../controllers/broadcastController.js';

const router = Router();

router.get('/', getBroadcasts);
router.post('/', createBroadcast);

export default router;
