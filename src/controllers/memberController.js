import { asyncHandler } from '../utils/asyncHandler.js';
import { MemberService } from '../services/memberService.js';

export const getMembers = asyncHandler(async (req, res) => {
  const { status, search, page, limit } = req.query;
  const result = await MemberService.getMembers({ status, search, page, limit });

  return res.status(200).json({
    success: true,
    message: 'Members fetched successfully',
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

export const getMemberIdCard = asyncHandler(async (req, res) => {
  const cardData = await MemberService.getMemberIdCard(req.params.id);
  return res.status(200).json({
    success: true,
    message: 'Member ID card fetched successfully',
    data: cardData,
  });
});

export const updateMemberStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason, rejectionReason } = req.body;
  const effectiveReason = rejectionReason !== undefined ? rejectionReason : (reason || '');
  const updated = await MemberService.updateStatus(id, status, effectiveReason);

  return res.status(200).json({
    success: true,
    status: true,
    message: 'Member status updated successfully',
    data: updated,
  });
});

export const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await MemberService.updateMember(id, req.body);

  return res.status(200).json({
    success: true,
    status: true,
    message: 'Member updated successfully',
    data: updated,
  });
});

export const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await MemberService.deleteMember(id);

  return res.status(200).json({
    success: true,
    status: true,
    message: 'Member deleted successfully',
    data: deleted,
  });
});

export const createMember = asyncHandler(async (req, res) => {
  const created = await MemberService.createMember(req.body);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Member created successfully',
    data: created,
  });
});
