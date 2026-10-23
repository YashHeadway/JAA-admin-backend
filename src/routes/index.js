import { Router } from 'express';
import authRoutes from './authRoutes.js';
import memberRoutes from './memberRoutes.js';
import committeeRoutes from './committeeRoutes.js';
import eventRoutes from './eventRoutes.js';
import groupRoutes from './groupRoutes.js';
import broadcastRoutes from './broadcastRoutes.js';
import leadRoutes from './leadRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import postRoutes from './postRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import adminProfileRoutes from './adminProfileRoutes.js';

const router = Router();

// Version 1 API routes
// Auth routes mounted at /auth and root for direct /api/login and /api/register endpoints
router.use('/auth', authRoutes);
router.use('/', authRoutes);

router.use('/admin-profile', adminProfileRoutes);
router.use('/admin/profile', adminProfileRoutes);
router.use('/members', memberRoutes);
router.use('/committee', committeeRoutes);
router.use('/events', eventRoutes);
router.use('/groups', groupRoutes);
router.use('/broadcasts', broadcastRoutes);
router.use('/leads', leadRoutes);
router.use('/complaints', complaintRoutes);
router.use('/posts', postRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/upload', uploadRoutes);

// Root API discovery endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to JAA Backend REST API',
    version: '1.0.0',
    documentation: {
      auth: {
        adminLogin: '/api/admin-login (or /api/auth/admin-login)',
        adminRegister: '/api/admin-register (or /api/auth/admin-register)',
        login: '/api/login (or /api/auth/login)',
        register: '/api/register (or /api/auth/register)',
        refreshToken: '/api/refresh-token (or /api/auth/refresh-token)',
        me: '/api/me (or /api/auth/me)',
        logout: '/api/logout (or /api/auth/logout)',
        forgotPassword: '/api/forgot-password (or /api/auth/forgot-password)',
        resetPassword: '/api/reset-password (or /api/auth/reset-password)',
        changePassword: '/api/change-password (or /api/auth/change-password)',
        adminProfile: '/api/admin-profile (or /api/auth/admin-profile)',
      },

      adminProfile: '/api/admin-profile',
      members: '/api/members',
      committee: '/api/committee',
      events: '/api/events',
      groups: '/api/groups',
      broadcasts: '/api/broadcasts',
      leads: '/api/leads',
      complaints: '/api/complaints',
      posts: '/api/posts',
      dashboard: '/api/dashboard',
      upload: '/api/upload',
    },
  });
});

export default router;

