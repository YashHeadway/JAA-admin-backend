import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthService } from '../services/authService.js';
import { TokenBlacklist, recordUserLogout } from '../models/TokenBlacklist.js';
import { extractToken } from '../middlewares/authMiddleware.js';

// Development session tracker to ensure logout works seamlessly even if browser drops Cookie header in Hoppscotch
let lastActiveSession = {
  token: null,
  userId: null,
  email: null,
};

export const getAuthCookieOptions = (req = null) => {
  const isHttps = req ? (req.secure || req.headers?.['x-forwarded-proto'] === 'https') : false;
  const isProductionHttps = process.env.NODE_ENV === 'production' && isHttps;

  return {
    httpOnly: true,
    secure: isProductionHttps, // false for localhost HTTP
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

export const getClearCookieOptions = (req = null) => {
  const isHttps = req ? (req.secure || req.headers?.['x-forwarded-proto'] === 'https') : false;
  const isProductionHttps = process.env.NODE_ENV === 'production' && isHttps;

  return {
    httpOnly: true,
    secure: isProductionHttps, // false for localhost HTTP
    sameSite: 'lax',
    path: '/',
  };
};

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  const token = result.accessToken || result.token;
  const cookieOptions = getAuthCookieOptions(req);

  // Set standard HTTP-only cookie
  res.cookie('token', token, cookieOptions);

  lastActiveSession = {
    token,
    userId: result.user?.id || result.user?._id,
    email: result.user?.email,
  };

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;
  delete userData.admin_auth_token;
  delete userData.lastLogoutAt;
  delete userData.password;

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: userData,
    token,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login({ email, password });
  const token = result.accessToken || result.token;
  const cookieOptions = getAuthCookieOptions(req);

  // Set standard HTTP-only cookie
  res.cookie('token', token, cookieOptions);

  lastActiveSession = {
    token,
    userId: result.user?.id || result.user?._id,
    email: result.user?.email,
  };

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;
  delete userData.admin_auth_token;
  delete userData.lastLogoutAt;
  delete userData.password;

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: userData,
    token,
  });
});

export const adminRegister = asyncHandler(async (req, res) => {
  const result = await AuthService.adminRegister(req.body);
  const token = result.accessToken || result.token;
  const cookieOptions = getAuthCookieOptions(req);

  // Set standard HTTP-only cookie
  res.cookie('token', token, cookieOptions);

  lastActiveSession = {
    token,
    userId: result.user?.id || result.user?._id,
    email: result.user?.email,
  };

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;
  delete userData.admin_auth_token;
  delete userData.lastLogoutAt;
  delete userData.password;

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: userData,
    token,
  });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.adminLogin({ email, password });
  const token = result.accessToken || result.token;
  const cookieOptions = getAuthCookieOptions(req);

  // Set standard HTTP-only cookie
  res.cookie('token', token, cookieOptions);

  lastActiveSession = {
    token,
    userId: result.user?.id || result.user?._id,
    email: result.user?.email,
  };

  const userData = { ...result.user };
  delete userData.token;
  delete userData.accessToken;
  delete userData.admin_auth_token;
  delete userData.lastLogoutAt;
  delete userData.password;

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: userData,
    token,
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken || req.body?.token;
  const result = await AuthService.refreshTokens(token);

  res.cookie('token', result.accessToken, getAuthCookieOptions());

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
  let token =
    extractToken(req) ||
    req.cookies?.token ||
    req.cookies?.auth_token ||
    req.cookies?.admin_auth_token ||
    req.body?.token ||
    req.body?.accessToken ||
    req.body?.admin_auth_token ||
    req.body?.auth_token ||
    req.query?.token ||
    req.query?.admin_auth_token ||
    req.query?.auth_token;

  // If no token was received over the wire (e.g. browser stripped Cookie header in Hoppscotch Web),
  // fallback to the most recent active session so that logout actually invalidates the session!
  if (!token && lastActiveSession.token) {
    token = lastActiveSession.token;
  }

  const userToLogout = req.user || (lastActiveSession.userId ? { id: lastActiveSession.userId, email: lastActiveSession.email } : null);

  if (token) {
    try {
      await TokenBlacklist.blacklistToken(token, userToLogout);
    } catch (_) {}
  }

  if (userToLogout) {
    try {
      recordUserLogout(userToLogout.id || userToLogout._id, userToLogout.email);
    } catch (_) {}
  } else if (req.body?.email) {
    try {
      recordUserLogout(null, req.body.email);
    } catch (_) {}
  }

  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
  if (refreshToken && refreshToken !== token) {
    try {
      await TokenBlacklist.blacklistToken(refreshToken, userToLogout);
    } catch (_) {}
  }

  // Clear tracked session
  lastActiveSession = { token: null, userId: null, email: null };

  const clearOpts = getClearCookieOptions(req);
  res.clearCookie('token', clearOpts);
  res.clearCookie('admin_auth_token', clearOpts);
  res.clearCookie('auth_token', clearOpts);
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.clearCookie('jwt', clearOpts);

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