/**
 * Auth Service – Google OAuth + Email/Password authentication.
 */

import { queryOne, execute } from './db.service.js';
import { signJwt } from '../middleware/auth.middleware.js';
import { toPublicProfile } from './profile.service.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail, type EmailSenderConfig } from './email.service.js';
import type { UserRow, EmailVerificationTokenRow, PasswordResetTokenRow, AuthResponse } from '../types/index.js';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../middleware/error-handler.middleware.js';

// ─── Password Hashing (PBKDF2 via Web Crypto) ─────────────────────

const HASH_ITERATIONS = 100000;
const HASH_KEY_LENGTH = 64; // bytes
const HASH_ALGORITHM = 'SHA-256';
const SALT_LENGTH = 16; // bytes

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: HASH_ITERATIONS, hash: HASH_ALGORITHM },
    keyMaterial,
    HASH_KEY_LENGTH * 8
  );

  const hashArray = new Uint8Array(hashBits);
  return `pbkdf2:${HASH_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(hashArray)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = parseInt(parts[1], 10);
  const salt = hexToBytes(parts[2]);
  const expectedHash = parts[3];

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: HASH_ALGORITHM },
    keyMaterial,
    HASH_KEY_LENGTH * 8
  );

  const hashHex = bytesToHex(new Uint8Array(hashBits));
  return timingSafeCompare(hashHex, expectedHash);
}

// ─── Token Generation ──────────────────────────────────────────────

function generateSecureToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

// ─── Validation Helpers ────────────────────────────────────────────

function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 255) {
    throw new ValidationError('Invalid email address');
  }
}

function validatePassword(password: string): void {
  if (password.length < 8) throw new ValidationError('Password must be at least 8 characters');
  if (password.length > 128) throw new ValidationError('Password must be 128 characters or less');
  if (!/[a-z]/.test(password)) throw new ValidationError('Password must contain at least one lowercase letter');
  if (!/[A-Z]/.test(password)) throw new ValidationError('Password must contain at least one uppercase letter');
  if (!/[0-9]/.test(password)) throw new ValidationError('Password must contain at least one number');
}

function validateName(name: string): void {
  if (!name || name.trim().length === 0) throw new ValidationError('Name is required');
  if (name.length > 255) throw new ValidationError('Name must be 255 characters or less');
}

// ─── JWT Helper ────────────────────────────────────────────────────

async function issueToken(user: UserRow, jwtSecret: string): Promise<AuthResponse> {
  const token = await signJwt(
    { sub: user.id, email: user.email, name: user.name },
    jwtSecret
  );

  return {
    token,
    user: toPublicProfile(user),
  };
}

// ─── Google OAuth ──────────────────────────────────────────────────

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified: string | boolean;
  name: string;
  picture?: string;
  aud: string;
  exp: string;
}

export async function verifyGoogleToken(idToken: string, googleClientId: string): Promise<GoogleTokenInfo> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);

  if (!response.ok) {
    throw new UnauthorizedError('Invalid Google ID token');
  }

  const payload = await response.json() as GoogleTokenInfo;

  if (payload.aud !== googleClientId) {
    throw new UnauthorizedError('Token audience mismatch: this token was not minted for this application.');
  }

  // Google might use string 'true' or boolean true
  const isVerified = payload.email_verified === 'true' || payload.email_verified === true;
  if (!isVerified) {
    throw new ValidationError('Google email is not verified');
  }

  // Validate expiration
  const exp = parseInt(payload.exp, 10);
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError('Google token expired');
  }

  return payload;
}

export async function googleSignIn(
  idToken: string,
  googleClientId: string,
  jwtSecret: string,
  databaseUrl: string
): Promise<AuthResponse> {
  const payload = await verifyGoogleToken(idToken, googleClientId);

  const googleId = payload.sub;
  const email = payload.email.toLowerCase().trim();
  const name = payload.name;
  const picture = payload.picture || '';

  // 1. Try to find user by google_id
  let user = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE google_id = $1`,
    [googleId]
  );

  if (user) {
    // Update existing Google user
    user = (await queryOne<UserRow>(
      databaseUrl,
      `UPDATE users SET name = $1, picture = $2, email = $3, email_verified = TRUE, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, picture, email, user.id]
    ))!;
  } else {
    // 2. Try to find user by email
    const existingByEmail = await queryOne<UserRow>(
      databaseUrl,
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (existingByEmail) {
      // Link Google account to existing email user
      user = (await queryOne<UserRow>(
        databaseUrl,
        `UPDATE users SET google_id = $1, picture = CASE WHEN picture = '' THEN $2 ELSE picture END, 
         email_verified = TRUE, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [googleId, picture, existingByEmail.id]
      ))!;
    } else {
      // 3. Create brand new user
      user = (await queryOne<UserRow>(
        databaseUrl,
        `INSERT INTO users (id, google_id, email, name, picture, email_verified, auth_provider)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, TRUE, 'google') RETURNING *`,
        [googleId, email, name, picture]
      ))!;
    }
  }

  return issueToken(user, jwtSecret);
}

// ─── Email Registration ────────────────────────────────────────────

export async function emailRegister(
  email: string,
  password: string,
  name: string,
  jwtSecret: string,
  databaseUrl: string,
  emailConfig: EmailSenderConfig,
  frontendUrl: string
): Promise<AuthResponse> {
  validateEmail(email);
  validatePassword(password);
  validateName(name);

  const normalizedEmail = email.toLowerCase().trim();

  // Check existing
  const existing = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  const user = await queryOne<UserRow>(
    databaseUrl,
    `INSERT INTO users (id, email, name, password_hash, email_verified, auth_provider)
     VALUES (gen_random_uuid(), $1, $2, $3, FALSE, 'email') RETURNING *`,
    [normalizedEmail, name.trim(), passwordHash]
  );

  if (!user) {
    throw new Error('Failed to create user account');
  }

  // Verification Token
  const verifyToken = generateSecureToken();
  await execute(
    databaseUrl,
    `INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
     VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '24 hours')`,
    [user.id, verifyToken]
  );

  // Send email asynchronously
  sendVerificationEmail(emailConfig, normalizedEmail, name, verifyToken, frontendUrl).catch((err) => {
    console.error('Failed to send verification email during registration:', err);
  });

  return issueToken(user, jwtSecret);
}

// ─── Email Login ───────────────────────────────────────────────────

export async function emailLogin(
  email: string,
  password: string,
  jwtSecret: string,
  databaseUrl: string
): Promise<AuthResponse> {
  validateEmail(email);

  if (!password) {
    throw new ValidationError('Password is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.password_hash) {
    throw new UnauthorizedError('This account is registered via Google sign-in. Please use Google login.');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return issueToken(user, jwtSecret);
}

// ─── Email Verification ────────────────────────────────────────────

export async function verifyEmail(
  token: string,
  databaseUrl: string
): Promise<{ message: string }> {
  if (!token || token.length !== 64) {
    throw new ValidationError('Invalid verification token format');
  }

  const tokenRow = await queryOne<EmailVerificationTokenRow>(
    databaseUrl,
    `SELECT * FROM email_verification_tokens WHERE token = $1 AND used = FALSE`,
    [token]
  );

  if (!tokenRow) {
    throw new ValidationError('Invalid or expired verification token');
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    throw new ValidationError('Verification token has expired');
  }

  await execute(
    databaseUrl,
    `UPDATE email_verification_tokens SET used = TRUE WHERE id = $1`,
    [tokenRow.id]
  );

  await execute(
    databaseUrl,
    `UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`,
    [tokenRow.user_id]
  );

  return { message: 'Email successfully verified.' };
}

// ─── Resend Verification Email ─────────────────────────────────────

export async function resendVerification(
  userId: string,
  databaseUrl: string,
  emailConfig: EmailSenderConfig,
  frontendUrl: string
): Promise<{ message: string }> {
  const user = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.email_verified) {
    throw new ValidationError('Email is already verified');
  }

  // Invalidate any old tokens
  await execute(
    databaseUrl,
    `UPDATE email_verification_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
    [userId]
  );

  const verifyToken = generateSecureToken();
  await execute(
    databaseUrl,
    `INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
     VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '24 hours')`,
    [userId, verifyToken]
  );

  await sendVerificationEmail(emailConfig, user.email, user.name, verifyToken, frontendUrl);

  return { message: 'A new verification email has been sent.' };
}

// ─── Change Password ───────────────────────────────────────────────

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  databaseUrl: string,
  emailConfig: EmailSenderConfig
): Promise<{ message: string }> {
  validatePassword(newPassword);

  const user = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.password_hash) {
    throw new ValidationError('This account uses Google sign-in and therefore does not have a password.');
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const newHash = await hashPassword(newPassword);

  await execute(
    databaseUrl,
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, userId]
  );

  sendPasswordChangedEmail(emailConfig, user.email, user.name).catch(() => { });

  return { message: 'Password has been successfully updated.' };
}

// ─── Forgot Password ──────────────────────────────────────────────

export async function forgotPassword(
  email: string,
  databaseUrl: string,
  emailConfig: EmailSenderConfig,
  frontendUrl: string
): Promise<{ message: string }> {
  validateEmail(email);
  const normalizedEmail = email.toLowerCase().trim();

  const user = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  // Return success even if not found to prevent user enumeration
  if (!user || !user.password_hash) {
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  // Invalidate old tokens
  await execute(
    databaseUrl,
    `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
    [user.id]
  );

  const resetToken = generateSecureToken();
  await execute(
    databaseUrl,
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
     VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '1 hour')`,
    [user.id, resetToken]
  );

  await sendPasswordResetEmail(emailConfig, user.email, user.name, resetToken, frontendUrl);

  return { message: 'If an account with that email exists, a password reset link has been sent.' };
}

// ─── Reset Password ───────────────────────────────────────────────

export async function resetPassword(
  token: string,
  newPassword: string,
  databaseUrl: string,
  emailConfig: EmailSenderConfig
): Promise<{ message: string }> {
  if (!token || token.length !== 64) {
    throw new ValidationError('Invalid reset token format');
  }

  validatePassword(newPassword);

  const tokenRow = await queryOne<PasswordResetTokenRow>(
    databaseUrl,
    `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE`,
    [token]
  );

  if (!tokenRow) {
    throw new ValidationError('Invalid or expired reset token');
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    throw new ValidationError('Reset token has expired');
  }

  const newHash = await hashPassword(newPassword);

  await execute(
    databaseUrl,
    `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
    [tokenRow.id]
  );

  await execute(
    databaseUrl,
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, tokenRow.user_id]
  );

  const user = await queryOne<UserRow>(databaseUrl, `SELECT * FROM users WHERE id = $1`, [tokenRow.user_id]);
  if (user) {
    sendPasswordChangedEmail(emailConfig, user.email, user.name).catch(() => { });
  }

  return { message: 'Password has been successfully reset.' };
}

export async function getUserById(databaseUrl: string, userId: string): Promise<UserRow | null> {
  return queryOne<UserRow>(databaseUrl, `SELECT * FROM users WHERE id = $1`, [userId]);
}
