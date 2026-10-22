import { asyncHandler } from '../utils/asyncHandler.js';
import { DashboardService } from '../services/dashboardService.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await DashboardService.getDashboardStats();
  return res.status(200).json({
    success: true,
    data: stats,
  });
});
