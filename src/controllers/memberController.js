import { asyncHandler } from '../utils/asyncHandler.js';
import { MemberService } from '../services/memberService.js';
import { getAuthCookieOptions } from './authController.js';

export const getMembers = asyncHandler(async (req, res) => {
  const { status, isActive, search, page, limit } = req.query;
  const result = await MemberService.getMembers({ status, isActive, search, page, limit });

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
  const { status, isActive, reason, rejectionReason } = req.body;
  const effectiveReason = rejectionReason !== undefined ? rejectionReason : (reason || '');
  const targetStatus = status !== undefined ? status : (isActive !== undefined ? (isActive ? 'active' : 'inactive') : 'active');
  const updated = await MemberService.updateStatus(id, targetStatus, effectiveReason);

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

  // Check logged-in user's role: if Admin or Super Admin -> 'admin', else -> 'user'
  const loggedInUser = req.admin || req.user;
  const userRole = loggedInUser?.role ? String(loggedInUser.role).trim().toLowerCase() : '';
  const isAdmin = userRole === 'admin' || userRole === 'super admin';

  let creator = 'user';
  const requestedCreator = req.body?.created_by ? String(req.body.created_by).trim().toLowerCase() : null;

  if (requestedCreator === 'user') {
    creator = 'user';
  } else if (requestedCreator === 'admin') {
    creator = isAdmin ? 'admin' : 'user';
  } else if (isAdmin) {
    creator = 'admin';
  } else {
    creator = 'user';
  }

  const created = await MemberService.createMember(req.body, {
    creator,
    role: loggedInUser?.role,
    user: loggedInUser,
    userId: loggedInUser?._id || loggedInUser?.id || null,
  });
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Member created successfully',
    data: created,
  });
});

export const registerMobileMember = asyncHandler(async (req, res) => {
  // Mobile / member self-registration is strictly 'user'
  const result = await MemberService.registerMobileMember(req.body, req.file, { creator: 'user' });
  const cookieOptions = getAuthCookieOptions(req);
  res.cookie('token', result.token, cookieOptions);

  return res.status(201).json({
    success: true,
    message: 'Member registered successfully. Your profile is pending approval.',
    data: result.member,
    token: result.token,
  });
});

export const loginMobileMember = asyncHandler(async (req, res) => {
  const result = await MemberService.loginMobileMember(req.body);
  const cookieOptions = getAuthCookieOptions(req);
  res.cookie('token', result.token, cookieOptions);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result.member,
    token: result.token,
  });
});

export const forgotMemberPassword = asyncHandler(async (req, res) => {
  const result = await MemberService.forgotMemberPassword(req.body);
  return res.status(200).json(result);
});

export const resetMemberPassword = asyncHandler(async (req, res) => {
  const result = await MemberService.resetMemberPassword(req.body);
  return res.status(200).json(result);
});

export const changeMemberPassword = asyncHandler(async (req, res) => {
  const result = await MemberService.changeMemberPassword({
    userId: req.user?.id,
    email: req.user?.email || req.body?.email,
    currentPassword: req.body?.currentPassword,
    newPassword: req.body?.newPassword,
    confirmPassword: req.body?.confirmPassword,
  });
  return res.status(200).json(result);
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
  const loggedInUser = req.admin || req.user;
  const userRole = loggedInUser?.role ? String(loggedInUser.role).trim().toLowerCase() : '';
  const isAdmin = userRole === 'admin' || userRole === 'super admin';
  const creator = isAdmin ? 'admin' : 'user';

  const result = await MemberService.bulkCreateMembers(members, { creator, user: loggedInUser });
  return res.status(201).json({
    success: true,
    status: true,
    message: `Successfully imported ${result.importedCount} members.`,
    ...result,
  });
});
