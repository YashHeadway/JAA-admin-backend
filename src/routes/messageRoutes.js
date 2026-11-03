import { Router } from 'express';
import groupRoutes from './groupRoutes.js';
import broadcastRoutes from './broadcastRoutes.js';
import { Group } from '../models/Group.js';
import { Broadcast } from '../models/Broadcast.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createBroadcast } from '../controllers/broadcastController.js';
import { getMembersForSelect } from '../controllers/groupController.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';

const router = Router();

// Top-level Message Module Dashboard / Overview API
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [totalGroups, totalBroadcasts, recentGroups, recentBroadcasts] = await Promise.all([
      Group.countDocuments(),
      Broadcast.countDocuments(),
      Group.find().sort({ id: -1 }).limit(5),
      Broadcast.find().sort({ id: -1 }).limit(10),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Messages module dashboard fetched successfully',
      data: {
        summary: {
          totalGroups,
          totalBroadcasts,
        },
        recentGroups,
        recentBroadcasts,
      },
    });
  })
);

// Member list helper for "Select From Members" in Group creation
router.get('/members', getMembersForSelect);

// Nested Groups sub-module under /api/messages/groups & /api/admin/messages/groups
router.use('/groups', groupRoutes);

// Nested Broadcasts sub-module under /api/messages/broadcasts & /api/admin/messages/broadcasts
router.use('/broadcasts', broadcastRoutes);

// Direct Send Broadcast alias under /api/messages/send
router.post('/send', handleFormData('attachment'), createBroadcast);
router.post('/create-broadcast', handleFormData('attachment'), createBroadcast);

export default router;

