'use strict';
const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS, // Gmail App Password (not your Gmail login password)
    },
  });
  return _transporter;
}

/**
 * Send a password reset OTP email.
 * @param {string} to   - recipient email
 * @param {string} otp  - 6-digit OTP
 * @param {string} name - recipient name
 */
async function sendPasswordResetOtp(to, otp, name) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('MAIL_USER or MAIL_PASS not set — skipping email send');
    return;
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"NuroSilicon" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Your NuroSilicon password reset OTP',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0D0D1A,#12082A);padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em;">
            Nuro<span style="background:linear-gradient(90deg,#00A6FF,#A855F7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Silicon</span>
          </h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#0a0a1a;font-weight:600;">Hi ${name},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
            We received a request to reset your NuroSilicon password. Use the OTP below — it expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;">Your OTP</p>
            <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:0.15em;color:#0a0a1a;font-family:monospace;">${otp}</p>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6;">
            If you did not request a password reset, you can safely ignore this email. Your password will not change.
          </p>
          <p style="margin:0;font-size:13px;color:#94a3b8;">— The NuroSilicon Team</p>
        </div>
      </div>
    `,
  });
}

/**
 * Send a welcome email after successful registration.
 * @param {string} to   - recipient email
 * @param {string} name - recipient name
 */
async function sendWelcomeEmail(to, name) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return;

  const transporter = getTransporter();
  const firstName = name.split(' ')[0];

  await transporter.sendMail({
    from: `"NuroSilicon" <${process.env.MAIL_USER}>`,
    to,
    subject: `Welcome to NuroSilicon, ${firstName}! 🎉`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0D0D1A,#12082A);padding:32px;text-align:center;">
          <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em;">
            Nuro<span style="background:linear-gradient(90deg,#00A6FF,#A855F7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Silicon</span>
          </h1>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);">Engineering Education Platform</p>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0a0a1a;">Welcome, ${firstName}! 🎉</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7;">
            Your NuroSilicon account is ready. You now have access to everything on the platform.
          </p>
          <div style="display:grid;gap:12px;margin-bottom:28px;">
            ${[
              ['🔬', 'HDL & Verilog Labs', 'Write and simulate Verilog/SystemVerilog in the browser'],
              ['💻', 'Coding Practice', 'C, C++, Python, Java — auto-graded with instant feedback'],
              ['📋', 'Objective Tests', 'MCQ, True/False, Fill-in-the-blank question banks'],
              ['🏆', 'Contests', 'Compete with peers and climb the leaderboard'],
            ].map(([icon, title, desc]) => `
              <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                <span style="font-size:20px;flex-shrink:0;">${icon}</span>
                <div>
                  <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#0a0a1a;">${title}</p>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">${desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="text-align:center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/student"
              style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#7c3aed,#00A6FF);color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;box-shadow:0 4px 16px rgba(124,58,237,0.3);">
              Go to Dashboard →
            </a>
          </div>
          <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

/**
 * Send email verification OTP after registration.
 */
async function sendVerificationOtp(to, otp, name) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('MAIL_USER or MAIL_PASS not set — skipping verification email');
    return;
  }
  const transporter = getTransporter();
  const firstName = name.split(' ')[0];
  await transporter.sendMail({
    from: `"NuroSilicon" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Verify your NuroSilicon email address',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0D0D1A,#12082A);padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">
            Nuro<span style="background:linear-gradient(90deg,#00A6FF,#A855F7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Silicon</span>
          </h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#0a0a1a;font-weight:600;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
            Thanks for registering! Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;">Verification OTP</p>
            <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:0.15em;color:#0a0a1a;font-family:monospace;">${otp}</p>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8;">If you did not create this account, ignore this email.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetOtp, sendWelcomeEmail, sendVerificationOtp };
