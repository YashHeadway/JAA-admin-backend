import { asyncHandler } from '../utils/asyncHandler.js';
import { BroadcastService } from '../services/broadcastService.js';

export const getBroadcasts = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await BroadcastService.getBroadcasts({ search, page, limit });

  return res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: result.data,
  });
});

export const createBroadcast = asyncHandler(async (req, res) => {
  const created = await BroadcastService.createBroadcast(req.body);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Broadcast created successfully',
    data: created,
  });
});
