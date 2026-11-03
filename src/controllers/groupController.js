import { asyncHandler } from '../utils/asyncHandler.js';
import { GroupService } from '../services/groupService.js';
import { BroadcastService } from '../services/broadcastService.js';

export const getMembersForSelect = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await GroupService.getMembersForSelect({ search, page, limit });

  return res.status(200).json({
    success: true,
    message: 'Members fetched successfully for selection',
    pagination: result.pagination,
    data: result.data,
  });
});

export const getGroups = asyncHandler(async (req, res) => {
  const { search, groupType, status, page, limit } = req.query;
  const result = await GroupService.getGroups({ search, groupType, status, page, limit });

  return res.status(200).json({
    success: true,
    message: 'Groups fetched successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

export const getGroupById = asyncHandler(async (req, res) => {
  const group = await GroupService.getGroupById(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Group details fetched successfully',
    data: group,
  });
});

export const createGroup = asyncHandler(async (req, res) => {
  const file = req.file || (req.files && req.files[0]) || null;
  const created = await GroupService.createGroup(req.body, file);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Group created successfully',
    data: created,
  });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const file = req.file || (req.files && req.files[0]) || null;
  const updated = await GroupService.updateGroup(req.params.id, req.body, file);
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

export const addMembersToGroup = asyncHandler(async (req, res) => {
  const file = req.file || (req.files && req.files[0]) || null;
  const members = req.body.members || req.body.memberIds || req.body;
  const updated = await GroupService.addMembers(req.params.id, members, file);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Members added to group successfully',
    data: updated,
  });
});

export const removeMemberFromGroup = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const updated = await GroupService.removeMember(id, memberId);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Member removed from group successfully',
    data: updated,
  });
});

export const sendGroupBroadcast = asyncHandler(async (req, res) => {
  const file = req.file || (req.files && req.files[0]) || null;
  const group = await GroupService.getGroupById(req.params.id);
  const broadcastData = {
    ...req.body,
    groupId: group.id,
    group_id: group.id,
    groupName: group.name || group.groupName,
    sendTo: req.body.sendTo || req.body.sentTo || group.name,
  };
  const created = await BroadcastService.createBroadcast(broadcastData, file);
  const updatedGroup = await GroupService.getGroupById(group.id);

  return res.status(201).json({
    success: true,
    status: true,
    message: 'Broadcast sent to group successfully',
    data: created,
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
