import { Router } from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  deletePost,
} from '../controllers/postController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { createPostSchema } from '../validations/postValidation.js';

const router = Router();

router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/', handleFormData('mainMedia'), validate(createPostSchema), createPost);
router.delete('/:id', deletePost);

export default router;
