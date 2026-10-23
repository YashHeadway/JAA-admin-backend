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
  const { token, newPassword, confirmPassword } = req.body;
  const result = await AuthService.resetPassword({ token, newPassword, confirmPassword });

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

export const renderResetPasswordPage = (req, res) => {
  // If passwords leaked into GET query params by accidental browser submission, strip them immediately
  if (req.query.newPassword || req.query.confirmPassword) {
    const cleanToken = req.query.token || '';
    return res.redirect(302, `/api/reset-password${cleanToken ? '?token=' + encodeURIComponent(cleanToken) : ''}`);
  }

  const token = req.query.token || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - JAA Portal</title>
  <link rel="icon" type="image/png" href="/api/assets/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
          },
          colors: {
            brand: {
              500: '#4c6ef5',
              600: '#3b5bdb',
              700: '#364fc7',
            },
          },
        },
      },
    };
  </script>

  <!-- bcryptjs Library (Local + CDN fallback) for client-side password encryption -->
  <script src="/api/assets/bcrypt.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js"></script>
</head>
<body class="font-sans min-h-screen flex items-center justify-center overflow-x-hidden bg-[#f4f6fc] p-5 text-slate-800">

  <!-- Soft background accents -->
  <div class="pointer-events-none fixed -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"></div>
  <div class="pointer-events-none fixed -bottom-32 -right-32 h-96 w-96 rounded-full bg-red-500/10 blur-3xl"></div>

  <div class="relative z-10 w-full max-w-[440px] rounded-3xl bg-white p-8 shadow-[0_25px_60px_-15px_rgba(67,97,238,0.25)] sm:p-10">

    <!-- Brand Header -->
    <div id="headerBlock" class="mb-8 text-center">
      <div class="mb-6 flex items-center justify-center">
        <img
          src="/api/assets/logo.png"
          onerror="this.src='/uploads/jaa-logo.png'"
          alt="Jewellers Association Ahmedabad"
          class="h-20 w-auto max-w-[290px] object-contain sm:h-24 sm:max-w-[330px] drop-shadow-sm transition-transform duration-200 hover:scale-105"
        />
      </div>
      <h1 class="text-xl font-bold text-slate-800">Set New Password</h1>
      <p class="mt-1.5 text-sm text-slate-500">Create a new password to secure your account.</p>
    </div>

    <!-- General Error Banner -->
    <div id="errorAlert" class="mb-5 hidden rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-snug text-red-600"></div>

    <!-- Reset Password Form -->
    <form id="resetForm" onsubmit="event.preventDefault(); return false;" novalidate>

      <!-- New Password -->
      <div class="mb-5">
        <label for="newPassword" class="mb-2 block text-sm font-semibold text-slate-600">New Password</label>
        <div class="relative">
          <input type="password" id="newPassword" placeholder="Enter new password" autocomplete="new-password"
            class="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15">
          <button type="button" onclick="toggleVisibility('newPassword', this)"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600">
            <svg class="icon-show h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <svg class="icon-hide hidden h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
        </div>
        <p id="newPasswordError" class="mt-1.5 hidden text-xs font-medium text-red-500"></p>
      </div>

      <!-- Confirm Password -->
      <div class="mb-6">
        <label for="confirmPassword" class="mb-2 block text-sm font-semibold text-slate-600">Confirm Password</label>
        <div class="relative">
          <input type="password" id="confirmPassword" placeholder="Confirm new password" autocomplete="new-password"
            class="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15">
          <button type="button" onclick="toggleVisibility('confirmPassword', this)"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600">
            <svg class="icon-show h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <svg class="icon-hide hidden h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
        </div>
        <p id="confirmPasswordError" class="mt-1.5 hidden text-xs font-medium text-red-500"></p>
      </div>

      <!-- Submit Button (brand gradient, matches dashboard active pill) -->
      <button
  type="submit"
  id="submitBtn"
  class="h-12 w-full rounded-full
         bg-gradient-to-b from-[#2939B5] to-[#4960F5]
         text-sm font-bold text-white
         shadow-lg shadow-blue-600/25
         transition-all duration-200
         enabled:hover:brightness-105
         disabled:cursor-not-allowed disabled:opacity-60"
>
  Change Password
</button>
    </form>

    <!-- Success View -->
    <div id="successView" class="hidden py-4 text-center">
      <div class="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/70">
        <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="mb-2 text-xl font-bold text-slate-800">Password Updated</h2>
      <p class="text-sm font-medium leading-relaxed text-slate-600">
        You have successfully changed your password.
      </p>
      <p class="mt-2 text-xs text-slate-400">
        You can now close this tab and log in with your new password.
      </p>
    </div>

    <p class="mt-8 text-center text-xs text-slate-400">Secure password reset &middot; JAA Portal</p>
  </div>

  <script>
    const token = ${JSON.stringify(token)};
    const form = document.getElementById('resetForm');
    const submitBtn = document.getElementById('submitBtn');
    const headerBlock = document.getElementById('headerBlock');
    const errorAlert = document.getElementById('errorAlert');
    const successView = document.getElementById('successView');

    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');

    // Clean browser address bar immediately if any passwords leaked in query parameters
    if (window.location.search && (window.location.search.includes('newPassword') || window.location.search.includes('confirmPassword'))) {
      const cleanUrl = window.location.pathname + (token ? '?token=' + encodeURIComponent(token) : '');
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (!token) {
      showGeneralError('Invalid or missing password reset token. Please request a new link from the app.');
      form.classList.add('hidden');
    }

    function toggleVisibility(inputId, btn) {
      const input = document.getElementById(inputId);
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      btn.querySelector('.icon-show').classList.toggle('hidden', !isVisible);
      btn.querySelector('.icon-hide').classList.toggle('hidden', isVisible);
    }

    function setFieldError(input, errorEl, msg) {
      if (msg) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
        input.classList.remove('border-slate-200', 'focus:border-brand-500', 'focus:ring-brand-500/15');
        input.classList.add('border-red-400', 'focus:border-red-500', 'focus:ring-red-500/15');
      } else {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
        input.classList.remove('border-red-400', 'focus:border-red-500', 'focus:ring-red-500/15');
        input.classList.add('border-slate-200', 'focus:border-brand-500', 'focus:ring-brand-500/15');
      }
    }

    function showGeneralError(msg) {
      errorAlert.textContent = msg;
      errorAlert.classList.remove('hidden');
    }

    function hideGeneralError() {
      errorAlert.classList.add('hidden');
    }

    // Real-time validation and error clearing while typing
    newPasswordInput.addEventListener('input', () => {
      if (newPasswordInput.value.length >= 4) {
        setFieldError(newPasswordInput, newPasswordError, '');
      }
      if (confirmPasswordInput.value) {
        if (newPasswordInput.value !== confirmPasswordInput.value) {
          setFieldError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match.');
        } else {
          setFieldError(confirmPasswordInput, confirmPasswordError, '');
        }
      }
    });

    confirmPasswordInput.addEventListener('input', () => {
      if (newPasswordInput.value !== confirmPasswordInput.value) {
        setFieldError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match.');
      } else {
        setFieldError(confirmPasswordInput, confirmPasswordError, '');
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideGeneralError();
      setFieldError(newPasswordInput, newPasswordError, '');
      setFieldError(confirmPasswordInput, confirmPasswordError, '');

      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      let hasError = false;

      if (!newPassword) {
        setFieldError(newPasswordInput, newPasswordError, 'Please enter a new password.');
        hasError = true;
      } else if (newPassword.length < 4) {
        setFieldError(newPasswordInput, newPasswordError, 'Password must be at least 4 characters long.');
        hasError = true;
      }

      if (!confirmPassword) {
        setFieldError(confirmPasswordInput, confirmPasswordError, 'Please confirm your new password.');
        hasError = true;
      } else if (newPassword && newPassword !== confirmPassword) {
        setFieldError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match.');
        hasError = true;
      }

      if (hasError) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating Password...';

      // Client-side password encryption with bcryptjs so raw plaintext never appears in network payload
      let encryptedPassword = newPassword;
      try {
        const bcryptLib = window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt);
        if (bcryptLib && typeof bcryptLib.hashSync === 'function') {
          const salt = bcryptLib.genSaltSync(10);
          encryptedPassword = bcryptLib.hashSync(newPassword, salt);
        } else {
          console.warn('bcryptjs library not yet loaded, falling back');
        }
      } catch (encryptErr) {
        console.error('Client encryption error:', encryptErr);
      }

      try {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            newPassword: encryptedPassword,
            confirmPassword: encryptedPassword
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          headerBlock.classList.add('hidden');
          form.classList.add('hidden');
          successView.classList.remove('hidden');
        } else {
          showGeneralError(data.message || 'Failed to reset password. Link may be expired.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Change Password';
        }
      } catch (err) {
        showGeneralError('Network error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change Password';
      }
    });
  </script>
</body>
</html>`;

  // Content-Security-Policy for Tailwind and local/CDN bcrypt assets
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data:; " +
    "connect-src 'self';"
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};