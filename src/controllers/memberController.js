import { asyncHandler } from '../utils/asyncHandler.js';
import { MemberService } from '../services/memberService.js';

export const getMembers = asyncHandler(async (req, res) => {
  const { status, search, page, limit } = req.query;
  const result = await MemberService.getMembers({ status, search, page, limit });

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    counts: result.counts,
  });
});

export const getMemberStats = asyncHandler(async (req, res) => {
  const stats = await MemberService.getStats();
  return res.status(200).json(stats);
});

export const getMemberById = asyncHandler(async (req, res) => {
  const member = await MemberService.getMemberById(req.params.id);
  return res.status(200).json({
    success: true,
    data: member,
  });
});

export const updateMemberStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const updated = await MemberService.updateStatus(id, status, reason);

  return res.status(200).json(updated);
});

export const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await MemberService.updateMember(id, req.body);

  return res.status(200).json({
    success: true,
    message: 'Member updated successfully',
    data: updated,
  });
});

export const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await MemberService.deleteMember(id);

  return res.status(200).json({
    success: true,
    message: 'Member deleted successfully',
    data: deleted,
  });
});

export const createMember = asyncHandler(async (req, res) => {
  const created = await MemberService.createMember(req.body);
  return res.status(201).json(created);
});
