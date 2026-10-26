import { asyncHandler } from '../utils/asyncHandler.js';
import { EventService } from '../services/eventService.js';

export const getEvents = asyncHandler(async (req, res) => {
  const { search, type, date, page, limit } = req.query;
  const result = await EventService.getEvents({ search, type, date, page, limit });

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await EventService.getEventById(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    data: event,
  });
});

export const createEvent = asyncHandler(async (req, res) => {
  const created = await EventService.createEvent(req.body);
  return res.status(201).json({
    success: true,
    status: true,
    message: 'Event created successfully',
    data: created,
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const updated = await EventService.updateEvent(req.params.id, req.body);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Event updated successfully',
    data: updated,
  });
});

export const toggleEventStatus = asyncHandler(async (req, res) => {
  const updated = await EventService.toggleStatus(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Event status updated successfully',
    data: updated,
  });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const deleted = await EventService.deleteEvent(req.params.id);
  return res.status(200).json({
    success: true,
    status: true,
    message: 'Event deleted successfully',
    data: deleted,
  });
});
