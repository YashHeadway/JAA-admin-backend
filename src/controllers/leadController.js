import { asyncHandler } from '../utils/asyncHandler.js';
import { LeadService } from '../services/leadService.js';

export const getLeads = asyncHandler(async (req, res) => {
  const { search, status, page, limit } = req.query;
  const result = await LeadService.getLeads({ search, status, page, limit });

  return res.status(200).json({
    success: true,
    message: 'Leads fetched successfully',
    pagination: result.pagination,
    data: {
      pagination: result.pagination,
      leads: result.leads,
    },
  });
});

export const getLeadById = asyncHandler(async (req, res) => {
  const lead = await LeadService.getLeadById(req.params.id);
  return res.status(200).json({
    success: true,
    message: 'Lead details fetched successfully',
    data: lead,
  });
});

export const createLead = asyncHandler(async (req, res) => {
  const created = await LeadService.createLead(req.body);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Lead created successfully',
    data: created,
  });
});

export const updateLead = asyncHandler(async (req, res) => {
  const updated = await LeadService.updateLead(req.params.id, req.body);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Lead updated successfully',
    data: updated,
  });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const deleted = await LeadService.deleteLead(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Lead deleted successfully',
    data: deleted,
  });
});

export const importLeads = asyncHandler(async (req, res) => {
  const { leads } = req.body;
  const result = await LeadService.importLeads(leads);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Leads imported successfully',
    data: result,
  });
});
