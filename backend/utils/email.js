/**
 * Email utility – GoDaddy SMTP (or any SMTP) via Nodemailer.
 *
 * Set in .env:
 *   SMTP_HOST=smtpout.secureserver.net
 *   SMTP_PORT=587
 *   SMTP_SECURE=false
 *   SMTP_USER=your@yourdomain.com
 *   SMTP_PASS=your-email-password
 *   EMAIL_FROM=House of Jainz <your@yourdomain.com>
 */

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtpout.secureserver.net';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'House of Jainz <noreply@houseofjainz.com>';

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Send OTP email for login
 */
async function sendOtpEmail(to, otp, appName = 'House of Jainz') {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email] SMTP not configured (SMTP_USER/SMTP_PASS). OTP would be:', otp, 'for', to);
    return true;
  }
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject: `Your ${appName} login code`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px;">
          <h2 style="color: #4CAF50;">Your login code</h2>
          <p>Use this code to sign in:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #333;">${otp}</p>
          <p style="color: #666;">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
        </div>
      `,
      text: `Your ${appName} login code is: ${otp}. It expires in 10 minutes.`,
    });
    return true;
  } catch (err) {
    console.error('Error sending OTP email:', err);
    return false;
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(to, resetLink, userName = 'User') {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email] SMTP not configured. Reset link:', resetLink);
    return true;
  }
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject: 'Reset Your Password - House of Jainz',
      html: `
        <div style="font-family: sans-serif;">
          <h2>Password Reset Request</h2>
          <p>Hello ${userName},</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <p><a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Error sending password reset email:', err);
    return false;
  }
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
  getTransporter,
};
