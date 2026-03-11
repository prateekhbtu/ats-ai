/**
 * Auth Routes – Google OAuth + Email/Password auth, password management.
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import {
  googleSignIn,
  emailRegister,
  emailLogin,
  verifyEmail,
  resendVerification,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';
import { strictRateLimiter } from '../middleware/rate-limiter.middleware.js';

const authRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ─── Utility ────────────────────────────────────────────────────────

function requireString(label: string, value: unknown, minLength?: number, maxLength?: number): string {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${label} is required and must be a string.`);
  }
  const s = value.trim();
  if (minLength !== undefined && s.length < minLength) {
    throw new ValidationError(`${label} must be at least ${minLength} characters.`);
  }
  if (maxLength !== undefined && s.length > maxLength) {
    throw new ValidationError(`${label} must be at most ${maxLength} characters.`);
  }
  return s;
}

// ─── POST /api/auth/google ─────────────────────────────────────────

authRoutes.post('/google', strictRateLimiter(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const idToken = requireString('id_token', body.id_token, 50, 5000);

  const result = await googleSignIn(
    idToken,
    c.env.GOOGLE_CLIENT_ID,
    c.env.JWT_SECRET,
    c.env.DATABASE_URL
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/register ───────────────────────────────────────

authRoutes.post('/register', strictRateLimiter(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = requireString('email', body.email);
  const password = requireString('password', body.password);
  const name = requireString('name', body.name);

  const result = await emailRegister(
    email,
    password,
    name,
    c.env.JWT_SECRET,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME },
    c.env.FRONTEND_URL
  );

  return c.json(result, 201);
});

// ─── POST /api/auth/login ──────────────────────────────────────────

authRoutes.post('/login', strictRateLimiter(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = requireString('email', body.email);
  const password = requireString('password', body.password);

  const result = await emailLogin(
    email,
    password,
    c.env.JWT_SECRET,
    c.env.DATABASE_URL
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/verify-email ───────────────────────────────────

authRoutes.post('/verify-email', strictRateLimiter(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = requireString('token', body.token, 64, 64);

  const result = await verifyEmail(token, c.env.DATABASE_URL);
  return c.json(result, 200);
});

// ─── POST /api/auth/resend-verify (auth required) ──────────────────

authRoutes.post('/resend-verify', strictRateLimiter(), authMiddleware, async (c) => {
  const userId = c.get('userId');

  const result = await resendVerification(
    userId,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME },
    c.env.FRONTEND_URL
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/change-password (auth required) ────────────────

authRoutes.post('/change-password', strictRateLimiter(), authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const current_password = requireString('current_password', body.current_password);
  const new_password = requireString('new_password', body.new_password);

  const userId = c.get('userId');

  const result = await changePassword(
    userId,
    current_password,
    new_password,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME }
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/forgot-password ────────────────────────────────

authRoutes.post('/forgot-password', strictRateLimiter(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = requireString('email', body.email);

  const result = await forgotPassword(
    email,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME },
    c.env.FRONTEND_URL
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/reset-password ─────────────────────────────────

authRoutes.post('/reset-password', strictRateLimiter(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = requireString('token', body.token, 64, 64);
  const new_password = requireString('new_password', body.new_password);

  const result = await resetPassword(
    token,
    new_password,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME }
  );

  return c.json(result, 200);
});

export default authRoutes;
