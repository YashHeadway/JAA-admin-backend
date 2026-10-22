import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthService } from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);

  // Set HTTP-only cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: result.user,
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

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result.user,
    token: result.accessToken,
  });
});

export const adminRegister = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.adminRegister({ email, password });

  // Set HTTP-only cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: result.user,
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

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result.user,
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
  res.clearCookie('token');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});





