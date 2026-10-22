import { asyncHandler } from '../utils/asyncHandler.js';
import { ComplaintService } from '../services/complaintService.js';

export const getComplaints = asyncHandler(async (req, res) => {
  const { search, status, priority, page, limit } = req.query;
  const result = await ComplaintService.getComplaints({ search, status, priority, page, limit });

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await ComplaintService.getComplaintById(req.params.id);
  return res.status(200).json(complaint);
});

export const createComplaint = asyncHandler(async (req, res) => {
  const created = await ComplaintService.createComplaint(req.body);
  return res.status(201).json(created);
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await ComplaintService.updateStatus(id, status);
  return res.status(200).json(updated);
});

export const deleteComplaint = asyncHandler(async (req, res) => {
  const deleted = await ComplaintService.deleteComplaint(req.params.id);
  return res.status(200).json(deleted);
});
