import { asyncHandler } from '../utils/asyncHandler.js';
import { MemberService } from '../services/memberService.js';

export const getMembers = asyncHandler(async (req, res) => {
  const { status, search, page, limit } = req.query;
  const result = await MemberService.getMembers({ status, search, page, limit });

  return res.status(200).json({
    success: true,
    message: 'Members fetched successfully',
    pagination: result.pagination,
    counts: result.counts,
    data: result.data,
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
  if (req.file) {
    req.body.avatar = req.file.filename ? `/uploads/${req.file.filename}` : req.file.path;
  }
  const created = await MemberService.createMember(req.body, {
    creator: 'admin',
    userId: req.user?._id || req.user?.id || null,
  });
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Member created successfully',
    data: created,
  });
});

export const registerMobileMember = asyncHandler(async (req, res) => {
  if (req.file) {
    req.body.avatar = req.file.filename ? `/uploads/${req.file.filename}` : req.file.path;
  }
  const created = await MemberService.createMember(req.body, {
    creator: 'user',
    userId: req.user?._id || req.user?.id || null,
  });
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Member registered successfully. Your profile is pending approval.',
    data: created,
  });
});

export const getMemberProfile = asyncHandler(async (req, res) => {
  const profile = await MemberService.getMemberProfile(req.user);
  return res.status(200).json({
    success: true,
    message: 'Member profile fetched successfully',
    data: profile,
  });
});

export const updateMemberProfile = asyncHandler(async (req, res) => {
  const updated = await MemberService.updateMemberProfile(req.user, req.body, req.file);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Member profile updated successfully',
    data: updated,
  });
});

export const bulkCreateMembers = asyncHandler(async (req, res) => {
  const members = Array.isArray(req.body) ? req.body : req.body.members;
  const result = await MemberService.bulkCreateMembers(members);
  return res.status(201).json({
    success: true,
    status: true,
    message: `Successfully imported ${result.importedCount} members.`,
    ...result,
  });
});
