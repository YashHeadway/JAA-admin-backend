import { Router } from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import { createPostSchema, updatePostSchema } from '../validations/postValidation.js';

const router = Router();

router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/', handleFormData('media'), validate(createPostSchema), createPost);
router.patch('/:id', handleFormData('media'), validate(updatePostSchema), updatePost);
router.put('/:id', handleFormData('media'), validate(updatePostSchema), updatePost);
router.delete('/:id', deletePost);

export default router;
