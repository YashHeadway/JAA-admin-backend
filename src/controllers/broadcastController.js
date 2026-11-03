import { asyncHandler } from '../utils/asyncHandler.js';
import { BroadcastService } from '../services/broadcastService.js';

export const getBroadcasts = asyncHandler(async (req, res) => {
  const { search, groupId, sentTo, page, limit } = req.query;
  const result = await BroadcastService.getBroadcasts({ search, groupId, sentTo, page, limit });

  return res.status(200).json({
    success: true,
    message: 'Broadcasts fetched successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

export const getBroadcastById = asyncHandler(async (req, res) => {
  const broadcast = await BroadcastService.getBroadcastById(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Broadcast details fetched successfully',
    data: broadcast,
  });
});

export const createBroadcast = asyncHandler(async (req, res) => {
  const file = req.file || (req.files && req.files[0]) || null;
  const created = await BroadcastService.createBroadcast(req.body, file);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Broadcast created successfully',
    data: created,
  });
});

export const deleteBroadcast = asyncHandler(async (req, res) => {
  const deleted = await BroadcastService.deleteBroadcast(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Broadcast deleted successfully',
    data: deleted,
  });
});
