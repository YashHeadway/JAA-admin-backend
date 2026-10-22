import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  toggleEventStatus,
  deleteEvent,
} from '../controllers/eventController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { createEventSchema, updateEventSchema } from '../validations/eventValidation.js';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', handleFormData('image'), validate(createEventSchema), createEvent);
router.put('/:id', handleFormData('image'), validate(updateEventSchema), updateEvent);
router.patch('/:id/status', toggleEventStatus);
router.patch('/:id', handleFormData('image'), validate(updateEventSchema), updateEvent);
router.delete('/:id', deleteEvent);

export default router;
