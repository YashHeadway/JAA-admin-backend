import { asyncHandler } from '../utils/asyncHandler.js';
import { AdminProfileService } from '../services/adminProfileService.js';

/**
 * Controller to fetch all admin profiles.
 * Endpoint: GET /api/admin/profiles or GET /api/admin/profile/all
 */
export const getAllAdminProfiles = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await AdminProfileService.getAllProfiles({ page, limit });

  return res.status(200).json({
    success: true,
    message: 'Admin profiles fetched successfully',
    total: result.total !== undefined ? result.total : result.length,
    pagination: result.pagination,
    data: result.data || result,
  });
});

/**
 * Controller to fetch currently authenticated admin's profile or specified target profile by ID.
 * Endpoint: GET /api/admin/profile or GET /api/admin/profile/:id
 */
export const getAdminProfile = asyncHandler(async (req, res) => {
  const targetId = req.params?.id;
  const profile = await AdminProfileService.getProfile(req.user, targetId);

  return res.status(200).json({
    success: true,
    message: 'Admin profile fetched successfully',
    data: profile,
  });
});

/**
 * Controller to update currently authenticated admin's profile.
 */
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const targetId = req.params?.id;
  const updatedProfile = await AdminProfileService.updateProfile(req.user, req.body, targetId);

  return res.status(200).json({
    success: true,
    message: 'Admin profile updated successfully',
    data: updatedProfile,
  });
});
