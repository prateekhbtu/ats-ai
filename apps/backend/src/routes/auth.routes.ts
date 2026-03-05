/**
 * Auth Routes – Google OAuth + Email/Password auth, password management.
 *
 * POST /api/auth/google         – Sign in with Google
 * POST /api/auth/register       – Register with email + password
 * POST /api/auth/login          – Login with email + password
 * POST /api/auth/verify-email   – Verify email token (public)
 * POST /api/auth/resend-verify  – Resend verification email (auth required)
 * POST /api/auth/change-password – Change password (auth required)
 * POST /api/auth/forgot-password – Request password reset (public)
 * POST /api/auth/reset-password  – Reset password with token (public)
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

// ─── POST /api/auth/google ─────────────────────────────────────────

authRoutes.post('/google', strictRateLimiter(), async (c) => {
  const body = await c.req.json<{ id_token?: string }>().catch(() => null);

  if (!body || !body.id_token || typeof body.id_token !== 'string') {
    throw new ValidationError('id_token is required and must be a string');
  }

  if (body.id_token.length < 50 || body.id_token.length > 5000) {
    throw new ValidationError('Invalid id_token format');
  }

  const result = await googleSignIn(
    body.id_token,
    c.env.GOOGLE_CLIENT_ID,
    c.env.JWT_SECRET,
    c.env.DATABASE_URL
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/register ───────────────────────────────────────

authRoutes.post('/register', strictRateLimiter(), async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.email || typeof body.email !== 'string') {
    throw new ValidationError('email is required and must be a string');
  }

  if (!body.password || typeof body.password !== 'string') {
    throw new ValidationError('password is required and must be a string');
  }

  if (!body.name || typeof body.name !== 'string') {
    throw new ValidationError('name is required and must be a string');
  }

  const result = await emailRegister(
    body.email,
    body.password,
    body.name,
    c.env.JWT_SECRET,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME },
    c.env.FRONTEND_URL
  );

  return c.json(result, 201);
});

// ─── POST /api/auth/login ──────────────────────────────────────────

authRoutes.post('/login', strictRateLimiter(), async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.email || typeof body.email !== 'string') {
    throw new ValidationError('email is required and must be a string');
  }

  if (!body.password || typeof body.password !== 'string') {
    throw new ValidationError('password is required and must be a string');
  }

  const result = await emailLogin(
    body.email,
    body.password,
    c.env.JWT_SECRET,
    c.env.DATABASE_URL
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/verify-email ───────────────────────────────────

authRoutes.post('/verify-email', strictRateLimiter(), async (c) => {
  const body = await c.req.json<{ token?: string }>().catch(() => null);

  if (!body || !body.token || typeof body.token !== 'string') {
    throw new ValidationError('token is required and must be a string');
  }

  const result = await verifyEmail(body.token, c.env.DATABASE_URL);
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
  const body = await c.req.json<{ current_password?: string; new_password?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.current_password || typeof body.current_password !== 'string') {
    throw new ValidationError('current_password is required and must be a string');
  }

  if (!body.new_password || typeof body.new_password !== 'string') {
    throw new ValidationError('new_password is required and must be a string');
  }

  const userId = c.get('userId');

  const result = await changePassword(
    userId,
    body.current_password,
    body.new_password,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME }
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/forgot-password ────────────────────────────────

authRoutes.post('/forgot-password', strictRateLimiter(), async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => null);

  if (!body || !body.email || typeof body.email !== 'string') {
    throw new ValidationError('email is required and must be a string');
  }

  const result = await forgotPassword(
    body.email,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME },
    c.env.FRONTEND_URL
  );

  return c.json(result, 200);
});

// ─── POST /api/auth/reset-password ─────────────────────────────────

authRoutes.post('/reset-password', strictRateLimiter(), async (c) => {
  const body = await c.req.json<{ token?: string; new_password?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.token || typeof body.token !== 'string') {
    throw new ValidationError('token is required and must be a string');
  }

  if (!body.new_password || typeof body.new_password !== 'string') {
    throw new ValidationError('new_password is required and must be a string');
  }

  const result = await resetPassword(
    body.token,
    body.new_password,
    c.env.DATABASE_URL,
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME }
  );

  return c.json(result, 200);
});

export default authRoutes;
