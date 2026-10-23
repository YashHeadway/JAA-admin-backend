import { asyncHandler } from '../utils/asyncHandler.js';
import { ComplaintService } from '../services/complaintService.js';

export const getComplaints = asyncHandler(async (req, res) => {
  const { search, status, priority, page, limit } = req.query;
  const result = await ComplaintService.getComplaints({ search, status, priority, page, limit });

  return res.status(200).json({
    success: true,
    message: 'Complaints fetched successfully',
    summary: result.summary,
    data: result.data,
  });
});

export const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await ComplaintService.getComplaintById(req.params.id);
  return res.status(200).json({
    success: true,
    message: 'Complaint details fetched successfully',
    data: complaint,
  });
});

export const createComplaint = asyncHandler(async (req, res) => {
  const created = await ComplaintService.createComplaint(req.body);
  return res.status(201).json({
    success: true,
    message: 'Complaint registered successfully',
    data: created,
  });
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await ComplaintService.updateStatus(id, req.body);
  return res.status(200).json({
    success: true,
    message: 'Complaint updated successfully',
    data: updated,
  });
});

export const deleteComplaint = asyncHandler(async (req, res) => {
  const deleted = await ComplaintService.deleteComplaint(req.params.id);
  return res.status(200).json({
    success: true,
    message: 'Complaint deleted successfully',
    data: {
      complaintId: deleted.complaintId !== undefined && !isNaN(Number(deleted.complaintId)) ? Number(deleted.complaintId) : (deleted.id || 1),
    },
  });
});
