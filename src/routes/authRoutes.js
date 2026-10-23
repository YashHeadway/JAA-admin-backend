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

const router = Router();

// General authentication
router.post('/register', authRateLimiter, handleFormData('avatar'), validate(registerSchema), register);
router.post('/login', authRateLimiter, handleFormData(), validate(loginSchema), login);

// Admin dedicated authentication (expects email and password only)
router.post('/admin-register', authRateLimiter, handleFormData(), validate(adminAuthSchema), adminRegister);
router.post('/admin-login', authRateLimiter, handleFormData(), validate(adminAuthSchema), adminLogin);

// Password recovery & reset flow
router.get('/assets/bcrypt.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.resolve('node_modules/bcryptjs/umd/index.js'));
});
router.get('/assets/logo.png', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(path.resolve('src/assets/jaa-logo.png'));
});
router.post('/forgot-password', authRateLimiter, handleFormData(), validate(forgotPasswordSchema), forgotPassword);
router.get('/reset-password', renderResetPasswordPage);
router.post('/reset-password', authRateLimiter, handleFormData(), validate(resetPasswordSchema), resetPassword);

// Change password (supports JSON, form-data, and both kebab-case / camelCase paths)
router.post(
  '/change-password',
  authRateLimiter,
  authenticateOptional,
  handleFormData(),
  validate(changePasswordSchema),
  changePassword
);
router.post(
  '/changePassword',
  authRateLimiter,
  authenticateOptional,
  handleFormData(),
  validate(changePasswordSchema),
  changePassword
);

// Token management & session
router.post('/refresh-token', authRateLimiter, handleFormData(), refreshToken);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

// Admin Profile alias
import('../routes/adminProfileRoutes.js').then((m) => {
  router.use('/admin-profile', m.default);
  router.use('/admin/profile', m.default);
  router.use('/profile', m.default);
});

export default router;


