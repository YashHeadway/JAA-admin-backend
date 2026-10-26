import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = Router();

router.get('/', getDashboardStats);
router.get('/stats', getDashboardStats);

export default router;
