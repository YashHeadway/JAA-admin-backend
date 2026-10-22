import { asyncHandler } from '../utils/asyncHandler.js';
import { BroadcastService } from '../services/broadcastService.js';

export const getBroadcasts = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await BroadcastService.getBroadcasts({ search, page, limit });

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const createBroadcast = asyncHandler(async (req, res) => {
  const created = await BroadcastService.createBroadcast(req.body);
  return res.status(201).json(created);
});
