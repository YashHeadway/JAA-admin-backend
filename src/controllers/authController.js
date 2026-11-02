import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthService } from '../services/authService.js';
import { TokenBlacklist } from '../models/TokenBlacklist.js';
import { extractToken } from '../middlewares/authMiddleware.js';

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);

  // Set HTTP-only cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: userData,
    token: result.accessToken,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login({ email, password });

  // Set HTTP-only cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: userData,
    token: result.accessToken,
  });
});

export const adminRegister = asyncHandler(async (req, res) => {
  const result = await AuthService.adminRegister(req.body);

  // Set HTTP-only cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: userData,
    token: result.accessToken,
  });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.adminLogin({ email, password });

  // Set HTTP-only cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: userData,
    token: result.accessToken,
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken || req.body?.token;
  const result = await AuthService.refreshTokens(token);

  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: result.user,
    token: result.accessToken,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await AuthService.getCurrentUser(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: user,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const token = extractToken(req) || req.body?.token || req.body?.accessToken;

  if (token) {
    await TokenBlacklist.blacklistToken(token, req.user);
  }

  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
  if (refreshToken && refreshToken !== token) {
    await TokenBlacklist.blacklistToken(refreshToken, req.user);
  }

  res.clearCookie('token');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.forgotPassword(email);

  if (result.resetToken) {
    res.setHeader('X-Reset-Token', result.resetToken);
  }

  const response = {
    success: true,
    message: result.message,
    resetToken: result.resetToken,
  };

  return res.status(200).json(response);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = req.body?.token || req.body?.resetToken;
  const { newPassword, confirmPassword, email } = req.body;
  const result = await AuthService.resetPassword({ token, newPassword, confirmPassword, email });

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = req.body?.currentPassword ?? req.body?.oldPassword;
  const newPassword = req.body?.newPassword;
  const confirmNewPassword = req.body?.confirmNewPassword ?? req.body?.confirmPassword;
  const email = req.body?.email;
  const userId = req.user?.id || req.user?._id;
  const userEmail = req.user?.email || email;

  const result = await AuthService.changePassword({
    userId,
    email: userEmail,
    currentPassword,
    newPassword,
    confirmNewPassword,
  });

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const renderResetPasswordPage = asyncHandler(async (req, res) => {
  const token = req.query.token || req.query.resetToken || '';
  let email = req.query.email || '';
  if (!email && token) {
    try {
      const verified = await AuthService.verifyResetToken(token);
      if (verified?.email) email = verified.email;
    } catch (_) {}
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return res.redirect(302, `${frontendUrl}/admin/reset-password?token=${encodeURIComponent(token)}${email ? '&email=' + encodeURIComponent(email) : ''}`);
});

export const verifyResetToken = asyncHandler(async (req, res) => {
  const token = req.query.token || req.params.token || req.query.resetToken;
  const result = await AuthService.verifyResetToken(token);
  return res.status(200).json({
    success: true,
    ...result,
  });
});