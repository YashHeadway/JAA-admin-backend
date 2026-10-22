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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-x: hidden;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      position: relative;
      z-index: 1;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      font-size: 24px;
      margin-bottom: 14px;
      box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
    }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
    p.subtitle { font-size: 14px; color: #64748b; }
    .form-group { margin-bottom: 18px; text-align: left; }
    label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    .input-wrapper { position: relative; }
    input[type="password"], input[type="text"] {
      width: 100%;
      padding: 12px 42px 12px 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 15px;
      font-family: inherit;
      color: #0f172a;
      transition: all 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .toggle-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      font-size: 16px;
      padding: 4px;
    }
    .toggle-btn:hover { color: #475569; }
    .btn-submit {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
      margin-top: 8px;
    }
    .btn-submit:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      transform: translateY(-1px);
    }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .alert {
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 18px;
      display: none;
      line-height: 1.4;
    }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
    .success-view { display: none; text-align: center; padding: 10px 0; }
    .success-icon {
      width: 56px;
      height: 56px;
      background: #dcfce7;
      color: #16a34a;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 14px;
    }

    /* Fallback Custom Pop-up Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      padding: 20px;
    }
    .modal-backdrop.active {
      opacity: 1;
      visibility: visible;
    }
    .modal-dialog {
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      width: 100%;
      max-width: 400px;
      padding: 36px 28px;
      text-align: center;
      transform: scale(0.85) translateY(20px);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-backdrop.active .modal-dialog {
      transform: scale(1) translateY(0);
    }
    .modal-icon-wrapper {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #dcfce7;
      margin: 0 auto 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 20px rgba(34, 197, 94, 0.2);
    }
    .modal-icon-wrapper svg {
      width: 42px;
      height: 42px;
      stroke: #16a34a;
      stroke-width: 3.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      stroke-dasharray: 60;
      stroke-dashoffset: 60;
      animation: checkAnim 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.2s forwards;
    }
    @keyframes checkAnim {
      to { stroke-dashoffset: 0; }
    }
    .modal-title {
      font-size: 21px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
    }
    .modal-desc {
      font-size: 15px;
      font-weight: 600;
      color: #334155;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn-modal {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, #16a34a, #15803d);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
      transition: all 0.2s;
    }
    .btn-modal:hover {
      background: linear-gradient(135deg, #15803d, #166534);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(22, 163, 74, 0.45);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-badge">🔑</div>
      <h1>Set New Password</h1>
      <p class="subtitle">Enter your new password below.</p>
    </div>

    <div id="errorAlert" class="alert alert-error"></div>

    <form id="resetForm" onsubmit="event.preventDefault(); return false;">
      <div class="form-group">
        <label for="newPassword">New Password</label>
        <div class="input-wrapper">
          <input type="password" id="newPassword" placeholder="Enter new password" required minlength="4" autocomplete="new-password">
          <button type="button" class="toggle-btn" onclick="toggleVisibility('newPassword', this)">👁️</button>
        </div>
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <div class="input-wrapper">
          <input type="password" id="confirmPassword" placeholder="Confirm new password" required minlength="4" autocomplete="new-password">
          <button type="button" class="toggle-btn" onclick="toggleVisibility('confirmPassword', this)">👁️</button>
        </div>
      </div>

      <button type="submit" id="submitBtn" class="btn-submit">
        <span>Change Password</span>
      </button>
    </form>

    <div id="successView" class="success-view">
      <div class="success-icon">✓</div>
      <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Password Reset Successfully!</h2>
      <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
        Your password has been updated. You can now close this window and log in with your new password.
      </p>
    </div>
  </div>

  <!-- Animated Success Pop-up Modal -->
  <div id="successModal" class="modal-backdrop">
    <div class="modal-dialog">
      <div class="modal-icon-wrapper">
        <svg viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h2 class="modal-title">Success!</h2>
      <p class="modal-desc">
        Your password changed successfully
      </p>
      <button type="button" class="btn-modal" onclick="closeModal()">OK, Got It!</button>
    </div>
  </div>

  <script>
    const token = ${JSON.stringify(token)};
    const form = document.getElementById('resetForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorAlert = document.getElementById('errorAlert');
    const successView = document.getElementById('successView');
    const successModal = document.getElementById('successModal');

    // Clean browser address bar immediately if any passwords leaked in query parameters
    if (window.location.search && (window.location.search.includes('newPassword') || window.location.search.includes('confirmPassword'))) {
      const cleanUrl = window.location.pathname + (token ? '?token=' + encodeURIComponent(token) : '');
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (!token) {
      showError('Invalid or missing password reset token. Please request a new link from the app.');
      form.style.display = 'none';
    }

    function toggleVisibility(inputId, btn) {
      const input = document.getElementById(inputId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🔒';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    }

    function showError(msg) {
      errorAlert.textContent = msg;
      errorAlert.style.display = 'block';
    }

    function showSuccessModal() {
      successModal.classList.add('active');
    }

    function closeModal() {
      successModal.classList.remove('active');
    }

    // Close modal if user clicks outside dialog
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        closeModal();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorAlert.style.display = 'none';

      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (!newPassword || !confirmPassword) {
        showError('Please enter both password fields.');
        return;
      }

      if (newPassword !== confirmPassword) {
        const errMsg = 'New password and confirm password do not match.';
        showError(errMsg);
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: 'Password Mismatch',
            text: errMsg,
            confirmButtonColor: '#ef4444'
          });
        }
        return;
      }

      if (newPassword.length < 4) {
        const errMsg = 'Password must be at least 4 characters long.';
        showError(errMsg);
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Password Too Short',
            text: errMsg,
            confirmButtonColor: '#f59e0b'
          });
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating Password...';

      try {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword, confirmPassword })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          form.style.display = 'none';
          successView.style.display = 'block';

          // Pop-up: "Your password changed successfully"
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Your password changed successfully',
              confirmButtonColor: '#2563eb',
              confirmButtonText: 'OK, Got It!',
              allowOutsideClick: false
            });
          } else {
            showSuccessModal();
          }
        } else {
          const errMsg = data.message || 'Failed to reset password. Link may be expired.';
          showError(errMsg);
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: errMsg,
              confirmButtonColor: '#ef4444'
            });
          }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Change Password';
        }
      } catch (err) {
        showError('Network error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change Password';
      }
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};







