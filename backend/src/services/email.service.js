const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

/**
 * Initialize the Nodemailer transporter.
 * Lazy initialization — only creates on first use.
 */
const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.NODE_ENV === 'test') {
    // Use ethereal for testing
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: 'test@ethereal.email', pass: 'test' },
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    rateLimit: 10,
  });

  return transporter;
};

/**
 * HTML email template wrapper.
 */
const emailTemplate = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', sans-serif; background: #0f0f1a; margin: 0; padding: 40px 0; }
    .container { max-width: 560px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; color: #e2e8f0; line-height: 1.7; }
    .body h2 { color: #a5b4fc; font-size: 18px; margin: 0 0 16px; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #0f0f1a; padding: 20px 32px; text-align: center; color: #6b7280; font-size: 12px; }
    .divider { border: none; border-top: 1px solid #374151; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 QRCodeAttend</h1>
      <p>Dynamic Proxy-Free Attendance Management</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} QRCodeAttend. All rights reserved.</p>
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send an email. Fails gracefully (logs error, does not throw).
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"QRCodeAttend" <${process.env.SMTP_USER || 'noreply@qrcodeattend.com'}>`,
      to,
      subject,
      text: text || subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send password reset email.
 */
const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = emailTemplate(
    'Reset Your Password',
    `
    <h2>Reset Your Password</h2>
    <p>Hi ${user.name},</p>
    <p>You requested a password reset for your QRCodeAttend account. Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
    <p style="text-align:center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <hr class="divider" />
    <p style="font-size:12px; color:#9ca3af;">If you did not request this, please ignore this email. Your password will remain unchanged.</p>
    <p style="font-size:12px; color:#9ca3af;">Link expires at: ${new Date(Date.now() + 3600000).toUTCString()}</p>
    `
  );

  return sendEmail({
    to: user.email,
    subject: '🔐 Reset Your QRCodeAttend Password',
    html,
  });
};

/**
 * Send session start notification to students.
 */
const sendSessionStartEmail = async (student, session, course) => {
  const html = emailTemplate(
    'Session Started',
    `
    <h2>📢 Session Started</h2>
    <p>Hi ${student.name},</p>
    <p>A new attendance session has been started for <strong>${course.name}</strong>.</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <tr><td style="padding:8px; color:#a5b4fc; font-weight:600;">Session:</td><td style="padding:8px;">${session.title}</td></tr>
      <tr style="background:#0f0f1a;"><td style="padding:8px; color:#a5b4fc; font-weight:600;">Course:</td><td style="padding:8px;">${course.name} (${course.code})</td></tr>
      <tr><td style="padding:8px; color:#a5b4fc; font-weight:600;">Time:</td><td style="padding:8px;">${new Date(session.startedAt).toLocaleString()}</td></tr>
    </table>
    <p>Open your QRCodeAttend app to scan the attendance QR code before the window closes.</p>
    `
  );

  return sendEmail({
    to: student.email,
    subject: `📢 Attendance Session Started — ${course.name}`,
    html,
  });
};

/**
 * Send low attendance warning email.
 */
const sendLowAttendanceEmail = async (student, course, percentage) => {
  const html = emailTemplate(
    'Low Attendance Warning',
    `
    <h2>⚠️ Low Attendance Warning</h2>
    <p>Hi ${student.name},</p>
    <p>Your attendance in <strong>${course.name}</strong> has dropped to <strong style="color:#ef4444;">${percentage}%</strong>, which is below the required threshold.</p>
    <p>Please ensure you attend upcoming sessions to avoid academic penalties.</p>
    <hr class="divider" />
    <p style="color:#9ca3af; font-size:12px;">If you believe this is an error, please contact your faculty.</p>
    `
  );

  return sendEmail({
    to: student.email,
    subject: `⚠️ Low Attendance Alert — ${course.name} (${percentage}%)`,
    html,
  });
};

/**
 * Send welcome / account created email.
 */
const sendWelcomeEmail = async (user, temporaryPassword = null) => {
  const html = emailTemplate(
    'Welcome to QRCodeAttend',
    `
    <h2>Welcome to QRCodeAttend! 🎉</h2>
    <p>Hi ${user.name},</p>
    <p>Your account has been created successfully. Here are your login details:</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <tr><td style="padding:8px; color:#a5b4fc; font-weight:600;">Email:</td><td style="padding:8px;">${user.email}</td></tr>
      <tr style="background:#0f0f1a;"><td style="padding:8px; color:#a5b4fc; font-weight:600;">Role:</td><td style="padding:8px; text-transform:capitalize;">${user.role}</td></tr>
      ${temporaryPassword ? `<tr><td style="padding:8px; color:#a5b4fc; font-weight:600;">Temp Password:</td><td style="padding:8px; font-family:monospace; font-weight:bold;">${temporaryPassword}</td></tr>` : ''}
    </table>
    ${temporaryPassword ? '<p style="color:#f59e0b; font-size:13px;">⚠️ Please change your password after your first login.</p>' : ''}
    `
  );

  return sendEmail({
    to: user.email,
    subject: '🎉 Welcome to QRCodeAttend',
    html,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendSessionStartEmail,
  sendLowAttendanceEmail,
  sendWelcomeEmail,
};
