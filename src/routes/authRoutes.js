import { Router } from 'express';
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
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  loginSchema,
  registerSchema,
  adminAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
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
router.post('/forgot-password', authRateLimiter, handleFormData(), validate(forgotPasswordSchema), forgotPassword);
router.get('/reset-password', renderResetPasswordPage);
router.post('/reset-password', authRateLimiter, handleFormData(), validate(resetPasswordSchema), resetPassword);

// Token management & session
router.post('/refresh-token', authRateLimiter, handleFormData(), refreshToken);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;


