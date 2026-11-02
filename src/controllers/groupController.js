import { asyncHandler } from '../utils/asyncHandler.js';
import { GroupService } from '../services/groupService.js';

export const getGroups = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await GroupService.getGroups({ search, page, limit });

  return res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getGroupById = asyncHandler(async (req, res) => {
  const group = await GroupService.getGroupById(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    data: group,
  });
});

export const createGroup = asyncHandler(async (req, res) => {
  const created = await GroupService.createGroup(req.body);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Group created successfully',
    data: created,
  });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const updated = await GroupService.updateGroup(req.params.id, req.body);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Group updated successfully',
    data: updated,
  });
});

export const toggleGroupStatus = asyncHandler(async (req, res) => {
  const updated = await GroupService.toggleStatus(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Group status updated successfully',
    data: updated,
  });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const deleted = await GroupService.deleteGroup(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Group deleted successfully',
    data: deleted,
  });
});
