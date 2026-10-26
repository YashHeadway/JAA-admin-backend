import { asyncHandler } from '../utils/asyncHandler.js';
import { CommitteeService } from '../services/committeeService.js';

export const getCommittee = asyncHandler(async (req, res) => {
  const { search, position, page, limit } = req.query;
  const result = await CommitteeService.getCommittee({ search, position, page, limit });

  return res.status(200).json({
    success: true,
    status: true,
    message: 'Committees retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const getCommitteeById = asyncHandler(async (req, res) => {
  const item = await CommitteeService.getCommitteeById(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Committee retrieved successfully',
    data: item,
  });
});

export const createCommittee = asyncHandler(async (req, res) => {
  const created = await CommitteeService.createCommittee(req.body);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Committee created successfully',
    data: created,
  });
});

export const updateCommittee = asyncHandler(async (req, res) => {
  const updated = await CommitteeService.updateCommittee(req.params.id, req.body);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Committee updated successfully',
    data: updated,
  });
});

export const deleteCommittee = asyncHandler(async (req, res) => {
  const deleted = await CommitteeService.deleteCommittee(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Committee deleted successfully',
    data: deleted,
  });
});
