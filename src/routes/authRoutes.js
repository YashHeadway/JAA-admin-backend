import { Router } from 'express';
import path from 'path';
import {
  login,
  register,
  adminLogin,
  adminRegister,
  refreshToken,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  renderResetPasswordPage,
  changePassword,
} from '../controllers/authController.js';
import { authenticate, authenticateOptional } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  loginSchema,
  registerSchema,
  adminAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/authValidation.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { handleFormData } from '../middlewares/uploadMiddleware.js';
import adminProfileRoutes from './adminProfileRoutes.js';

const router = Router();

// Admin dedicated authentication (expects email and password only)
router.post(
  ['/admin/register', '/admin/signup', '/admin-register', '/admin-signup'],
  authRateLimiter,
  handleFormData(),
  validate(adminAuthSchema),
  adminRegister
);
router.post(
  ['/admin/login', '/adminLogin', '/admin-login'],
  authRateLimiter,
  handleFormData(),
  validate(adminAuthSchema),
  adminLogin
);

// General authentication (Register / Signup)
router.post(['/register', '/signup'], authRateLimiter, handleFormData('avatar'), validate(registerSchema), register);
router.post(['/login'], authRateLimiter, handleFormData(), validate(loginSchema), login);

// Password recovery & reset flow (supports both forgot-password and forget-password)
router.get('/assets/bcrypt.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.resolve('node_modules/bcryptjs/umd/index.js'));
});
router.get('/assets/logo.png', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(path.resolve('src/assets/jaa-logo.png'));
});
router.post(
  [
    '/forgot-password',
    '/forget-password',
    '/forgotPassword',
    '/forgetPassword',
    '/admin/forgot-password',
    '/admin/forget-password',
    '/admin/forgotPassword',
    '/admin/forgetPassword',
    '/admin-forgot-password',
    '/admin-forget-password',
    '/adminForgotPassword',
    '/adminForgetPassword',
  ],
  authRateLimiter,
  handleFormData(),
  validate(forgotPasswordSchema),
  forgotPassword
);
router.get(
  ['/reset-password', '/resetPassword', '/admin/reset-password', '/admin/resetPassword', '/admin-reset-password', '/adminResetPassword'],
  renderResetPasswordPage
);
router.post(
  [
    '/reset-password',
    '/resetPassword',
    '/admin/reset-password',
    '/admin/resetPassword',
    '/admin-reset-password',
    '/adminResetPassword',
  ],
  authRateLimiter,
  handleFormData(),
  validate(resetPasswordSchema),
  resetPassword
);

// Change password (supports JSON, form-data, and both kebab-case / camelCase paths)
router.post(
  [
    '/change-password',
    '/changePassword',
    '/admin/change-password',
    '/admin/changePassword',
    '/admin-change-password',
    '/adminChangePassword',
  ],
  authRateLimiter,
  authenticate,
  handleFormData(),
  validate(changePasswordSchema),
  changePassword
);

// Token management & session
router.post('/refresh-token', authRateLimiter, handleFormData(), refreshToken);
router.get('/me', authenticate, getMe);

// Logout (supports /logout, /admin/logout, /admin-logout, /adminLogout)
router.post(['/logout', '/admin/logout', '/admin-logout', '/adminLogout'], authenticateOptional, logout);

// Profile routes (GET Profile, POST Update Profile, PUT / PATCH)
router.use('/admin-profile', adminProfileRoutes);
router.use('/admin/profile', adminProfileRoutes);
router.use('/profile', adminProfileRoutes);
router.use('/update-profile', adminProfileRoutes);
router.use('/updateProfile', adminProfileRoutes);
router.use('/admin-update-profile', adminProfileRoutes);
router.use('/adminUpdateProfile', adminProfileRoutes);

export default router;


