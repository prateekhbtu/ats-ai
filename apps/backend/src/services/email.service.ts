/**
 * Email Service – Resend integration for transactional emails.
 * Works in Cloudflare Workers (fetch-based, no Node APIs).
 */

interface ResendSendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

interface ResendResponse {
  id: string;
}

export interface EmailSenderConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

async function sendEmail(apiKey: string, payload: ResendSendPayload): Promise<ResendResponse> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<ResendResponse>;
}

export async function sendVerificationEmail(
  config: EmailSenderConfig,
  toEmail: string,
  userName: string,
  verificationToken: string,
  frontendUrl: string
): Promise<void> {
  const verifyLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">ATS AI Optimizer</h1>
  </div>
  <h2 style="color: #1f2937;">Verify your email address</h2>
  <p>Hi ${escapeHtml(userName)},</p>
  <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${verifyLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email</a>
  </div>
  <p style="color: #6b7280; font-size: 14px;">Or copy and paste this URL into your browser:</p>
  <p style="color: #6b7280; font-size: 13px; word-break: break-all;">${verifyLink}</p>
  <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
</body>
</html>`;

  await sendEmail(config.apiKey, {
    from: `${config.fromName} <${config.fromEmail}>`,
    to: [toEmail],
    subject: 'Verify your email address – ATS AI Optimizer',
    html,
  });
}

export async function sendPasswordResetEmail(
  config: EmailSenderConfig,
  toEmail: string,
  userName: string,
  resetToken: string,
  frontendUrl: string
): Promise<void> {
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; ATS AI Optimizer</h1>
  </div>
  <h2 style="color: #1f2937;">Reset your password</h2>
  <p>Hi ${escapeHtml(userName)},</p>
  <p>We received a request to reset your password. Click the button below to choose a new one:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
  </div>
  <p style="color: #6b7280; font-size: 14px;">Or copy and paste this URL into your browser:</p>
  <p style="color: #6b7280; font-size: 13px; word-break: break-all;">${resetLink}</p>
  <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">If you didn't request a password reset, your account is still safe.</p>
</body>
</html>`;

  await sendEmail(config.apiKey, {
    from: `${config.fromName} <${config.fromEmail}>`,
    to: [toEmail],
    subject: 'Reset your password – ATS AI Optimizer',
    html,
  });
}

export async function sendAccountDeletedEmail(
  config: EmailSenderConfig,
  toEmail: string,
  userName: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb;">ATS AI Optimizer</h1>
  </div>
  <h2 style="color: #1f2937;">Account deleted</h2>
  <p>Hi ${escapeHtml(userName)},</p>
  <p>Your account and all associated data have been permanently deleted as requested.</p>
  <p>We're sorry to see you go. If you ever want to use ATS AI Optimizer again, you're welcome to create a new account.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">This is a confirmation email. No further action is required.</p>
</body>
</html>`;

  await sendEmail(config.apiKey, {
    from: `${config.fromName} <${config.fromEmail}>`,
    to: [toEmail],
    subject: 'Your account has been deleted – ATS AI Optimizer',
    html,
  });
}

export async function sendPasswordChangedEmail(
  config: EmailSenderConfig,
  toEmail: string,
  userName: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb;">ATS AI Optimizer</h1>
  </div>
  <h2 style="color: #1f2937;">Password changed</h2>
  <p>Hi ${escapeHtml(userName)},</p>
  <p>Your password has been successfully changed.</p>
  <p>If you did not make this change, please reset your password immediately or contact support.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">This is a security notification.</p>
</body>
</html>`;

  await sendEmail(config.apiKey, {
    from: `${config.fromName} <${config.fromEmail}>`,
    to: [toEmail],
    subject: 'Password changed – ATS AI Optimizer',
    html,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
