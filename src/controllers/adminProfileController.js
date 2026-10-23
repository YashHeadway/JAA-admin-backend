import { asyncHandler } from '../utils/asyncHandler.js';
import { AdminProfileService } from '../services/adminProfileService.js';

export const getAdminProfile = asyncHandler(async (req, res) => {
  const targetId = req.params?.id;
  const profile = await AdminProfileService.getProfile(req.user, targetId);
  return res.status(200).json({
    success: true,
    message: 'Admin profile retrieved successfully',
    data: profile,
  });
});

export const updateAdminProfile = asyncHandler(async (req, res) => {
  const targetId = req.params?.id;
  const updatedProfile = await AdminProfileService.updateProfile(req.user, req.body, targetId);
  return res.status(200).json({
    success: true,
    message: 'Admin profile updated successfully',
    data: updatedProfile,
  });
});
