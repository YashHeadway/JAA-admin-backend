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
import messageRoutes from './messageRoutes.js';
import adminProfileRoutes from './adminProfileRoutes.js';
import adminRoutes from './admin.routes.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * Determine if an incoming route is public (auth/recovery/discovery)
 * and therefore does not require an active login session.
 */
const isPublicRoute = (req) => {
  const rawPath = (req.path || '').toLowerCase();
  const rawUrl = (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
  const cleanPath = rawPath.replace(/\/+$/, '');
  const cleanUrl = rawUrl.replace(/\/+$/, '');

  // Root discovery & health endpoints
  if (
    cleanPath === '' ||
    cleanPath === '/admin' ||
    cleanPath === '/health' ||
    cleanUrl === '/api' ||
    cleanUrl === '/api/admin' ||
    cleanUrl === '/health' ||
    cleanUrl === '/api/health'
  ) {
    return true;
  }

  // Static assets for password reset page
  if (cleanPath.includes('/assets/') || cleanUrl.includes('/assets/')) {
    return true;
  }

  // Public authentication & password recovery endpoints
  const publicKeywords = [
    'login',
    'adminlogin',
    'admin-login',
    'register',
    'adminregister',
    'admin-register',
    'signup',
    'admin-signup',
    'adminsignup',
    'forgot-password',
    'forget-password',
    'forgotpassword',
    'forgetpassword',
    'reset-password',
    'resetpassword',
    'verify-reset-token',
    'verifyresettoken',
    'verify-token',
    'refresh-token',
    'refreshtoken',
    'logout',
    'adminlogout',
    'admin-logout',
  ];

  return publicKeywords.some((keyword) => {
    return (
      cleanPath === `/${keyword}` ||
      cleanPath.endsWith(`/${keyword}`) ||
      cleanUrl === `/${keyword}` ||
      cleanUrl.endsWith(`/${keyword}`)
    );
  });
};

/**
 * STRICT GLOBAL AUTHENTICATION GUARD:
 * Ensures that once a user logs out, or if a user is not logged in,
 * they CANNOT access any API data. Any attempt to access data without
 * an active login session returns 401 Unauthorized:
 * "You are not authenticated, please login first".
 */
router.use((req, res, next) => {
  if (isPublicRoute(req)) {
    return next();
  }
  return authenticate(req, res, next);
});

// Version 1 API routes
// Auth routes mounted at /auth and root for direct /api/login and /api/register endpoints
router.use('/auth', authRoutes);
router.use('/', authRoutes);

// Admin dedicated routes (GET /api/admin/profile)
router.use(['/admin', '/admin/admin'], adminRoutes);

// Admin prefixed route group (supports <<admin_base_url>> e.g. http://192.168.1.49:5000/api/admin/)
router.use(['/admin/auth', '/admin/admin/auth'], authRoutes);
router.use(['/admin', '/admin/admin'], authRoutes);
router.use(['/admin/members', '/admin/admin/members'], memberRoutes);
router.use(['/admin/committee', '/admin/admin/committee'], committeeRoutes);
router.use(['/admin/events', '/admin/admin/events'], eventRoutes);
router.use(['/admin/groups', '/admin/admin/groups'], groupRoutes);
router.use(['/admin/broadcasts', '/admin/admin/broadcasts'], broadcastRoutes);
router.use(['/admin/messages', '/admin/admin/messages'], messageRoutes);
router.use(['/admin/leads', '/admin/admin/leads'], leadRoutes);
router.use(['/admin/complaints', '/admin/admin/complaints'], complaintRoutes);
router.use(['/admin/posts', '/admin/admin/posts'], postRoutes);
router.use(['/admin/dashboard', '/admin/admin/dashboard'], dashboardRoutes);
router.use(['/admin/upload', '/admin/admin/upload'], uploadRoutes);
router.use(['/admin/admin-profile', '/admin/admin/admin-profile'], adminProfileRoutes);
router.use(['/admin/profile', '/admin/admin/profile'], adminProfileRoutes);
router.use(['/admin/update-profile', '/admin/admin/update-profile'], adminProfileRoutes);
router.use(['/admin/updateProfile', '/admin/admin/updateProfile'], adminProfileRoutes);
router.use(['/admin/admin-update-profile', '/admin/admin/admin-update-profile'], adminProfileRoutes);
router.use(['/admin/adminUpdateProfile', '/admin/admin/adminUpdateProfile'], adminProfileRoutes);

// Direct root route groups (e.g. /api/members, /api/committee, etc.)
router.use('/profiles', adminProfileRoutes);
router.use('/admin-profile', adminProfileRoutes);
router.use('/admin/profile', adminProfileRoutes);
router.use('/profile', adminProfileRoutes);
router.use('/update-profile', adminProfileRoutes);
router.use('/updateProfile', adminProfileRoutes);
router.use('/admin-update-profile', adminProfileRoutes);
router.use('/adminUpdateProfile', adminProfileRoutes);
router.use(['/members', '/member'], memberRoutes);
router.use('/committee', committeeRoutes);
router.use('/events', eventRoutes);
router.use('/groups', groupRoutes);
router.use('/broadcasts', broadcastRoutes);
router.use('/messages', messageRoutes);
router.use('/leads', leadRoutes);
router.use('/complaints', complaintRoutes);
router.use('/posts', postRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/upload', uploadRoutes);

// Root API discovery endpoint (accessible at /api, /api/admin, and /api/admin/)
router.get(['/', '/admin', '/admin/'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to JAA Admin REST API',
    version: '1.0.0',
    documentation: {
      adminRoutes: {
        members: '/admin/members',
        committee: '/admin/committee',
        events: '/admin/events',
        groups: '/admin/groups',
        broadcasts: '/admin/broadcasts',
        messages: '/admin/messages',
        leads: '/admin/leads',
        complaints: '/admin/complaints',
        posts: '/admin/posts',
        dashboard: '/admin/dashboard',
        upload: '/admin/upload',
        auth: {
          adminLogin: '/admin/login',
          adminRegister: '/admin/register',
          adminForgetPassword: '/admin/forget-password',
          adminResetPassword: '/admin/reset-password',
          adminChangePassword: '/admin/change-password',
          adminLogout: '/admin/logout',
          adminProfile: '/admin/profile',
        },
      },
      userRoutes: {
        members: '/members',
        committee: '/committee',
        events: '/events',
        groups: '/groups',
        broadcasts: '/broadcasts',
        messages: '/messages',
        leads: '/leads',
        complaints: '/complaints',
        posts: '/posts',
        dashboard: '/dashboard',
        upload: '/upload',
        auth: {
          memberRegister: '/members/register',
          memberLogin: '/members/login',
          memberForgotPassword: '/members/forgot-password',
          memberResetPassword: '/members/reset-password',
          memberChangePassword: '/members/change-password',
          memberProfile: '/members/profile',
          memberLogout: '/members/logout',
        },
      },
    },
  });
});

export default router;
