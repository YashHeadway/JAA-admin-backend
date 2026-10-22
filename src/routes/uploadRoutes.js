import { Router } from 'express';
import { uploadSingle, uploadMultiple } from '../controllers/uploadController.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/single', upload.single('file'), uploadSingle);
router.post('/multiple', upload.array('files', 10), uploadMultiple);

export default router;
