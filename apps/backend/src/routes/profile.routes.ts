/**
 * Profile Routes – User profile CRUD, picture upload, account deletion.
 *
 * GET    /api/profile           – Get current user profile
 * PUT    /api/profile           – Update profile fields
 * POST   /api/profile/picture   – Upload profile picture (Cloudinary)
 * DELETE /api/profile/picture   – Remove profile picture
 * DELETE /api/profile           – Delete account
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  removeProfilePicture,
  deleteAccount,
  getUserRow,
} from '../services/profile.service.js';
import { uploadProfilePicture, deleteProfilePicture } from '../services/cloudinary.service.js';
import { verifyPassword } from '../services/auth.service.js';
import { sendAccountDeletedEmail } from '../services/email.service.js';

const profileRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// All profile routes require authentication
profileRoutes.use('/*', authMiddleware);

// ─── GET /api/profile ──────────────────────────────────────────────

profileRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const profile = await getProfile(c.env.DATABASE_URL, userId);
  return c.json({ profile }, 200);
});

// ─── PUT /api/profile ──────────────────────────────────────────────

profileRoutes.put('/', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);

  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body is required');
  }

  const userId = c.get('userId');

  const allowedFields = ['name', 'phone', 'headline', 'location', 'bio', 'linkedin_url', 'website_url'];
  const updateData: Record<string, string> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
        throw new ValidationError(`${field} must be a string`);
      }
      updateData[field] = body[field] as string;
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new ValidationError('At least one field to update is required');
  }

  const profile = await updateProfile(c.env.DATABASE_URL, userId, updateData);
  return c.json({ profile }, 200);
});

// ─── POST /api/profile/picture ─────────────────────────────────────

profileRoutes.post('/picture', async (c) => {
  const userId = c.get('userId');

  const contentType = c.req.header('Content-Type') || '';

  let fileData: ArrayBuffer;
  let imageContentType: string;

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const file = formData.get('picture');

    if (!file || typeof file === 'string') {
      throw new ValidationError('picture file is required');
    }

    // file is a File/Blob from FormData
    const blob = file as unknown as { arrayBuffer(): Promise<ArrayBuffer>; type: string; name: string };
    fileData = await blob.arrayBuffer();
    imageContentType = blob.type || 'image/jpeg';
  } else if (contentType.startsWith('image/')) {
    // Direct binary upload
    fileData = await c.req.arrayBuffer();
    imageContentType = contentType.split(';')[0].trim();
  } else {
    throw new ValidationError('Upload picture as multipart/form-data or direct binary with Content-Type: image/*');
  }

  if (fileData.byteLength === 0) {
    throw new ValidationError('Empty file');
  }

  const cloudinaryConfig = {
    cloudName: c.env.CLOUDINARY_CLOUD_NAME,
    apiKey: c.env.CLOUDINARY_API_KEY,
    apiSecret: c.env.CLOUDINARY_API_SECRET,
  };

  const pictureUrl = await uploadProfilePicture(cloudinaryConfig, fileData, imageContentType, userId);
  const profile = await updateProfilePicture(c.env.DATABASE_URL, userId, pictureUrl);

  return c.json({ profile }, 200);
});

// ─── DELETE /api/profile/picture ───────────────────────────────────

profileRoutes.delete('/picture', async (c) => {
  const userId = c.get('userId');

  const cloudinaryConfig = {
    cloudName: c.env.CLOUDINARY_CLOUD_NAME,
    apiKey: c.env.CLOUDINARY_API_KEY,
    apiSecret: c.env.CLOUDINARY_API_SECRET,
  };

  // Try to delete from Cloudinary (don't fail if image doesn't exist)
  try {
    await deleteProfilePicture(cloudinaryConfig, userId);
  } catch {
    // Ignore Cloudinary errors on delete (image might not exist)
  }

  const profile = await removeProfilePicture(c.env.DATABASE_URL, userId);
  return c.json({ profile }, 200);
});

// ─── DELETE /api/profile ───────────────────────────────────────────

profileRoutes.delete('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const password = typeof body.password === 'string' ? body.password : undefined;

  // Get user to check auth provider
  const userRow = await getUserRow(c.env.DATABASE_URL, userId);

  if (!userRow) {
    throw new ValidationError('User not found');
  }

  // Email auth users must confirm with password
  if (userRow.auth_provider === 'email' && userRow.password_hash) {
    if (!password) {
      throw new ValidationError('Password confirmation is required to delete an email-based account');
    }

    const valid = await verifyPassword(password, userRow.password_hash);
    if (!valid) {
      throw new ValidationError('Incorrect password');
    }
  }

  // Try to clean up Cloudinary picture
  if (userRow.picture && userRow.picture.includes('cloudinary')) {
    const cloudinaryConfig = {
      cloudName: c.env.CLOUDINARY_CLOUD_NAME,
      apiKey: c.env.CLOUDINARY_API_KEY,
      apiSecret: c.env.CLOUDINARY_API_SECRET,
    };

    try {
      await deleteProfilePicture(cloudinaryConfig, userId);
    } catch {
      // Don't block account deletion
    }
  }

  const { email, name } = await deleteAccount(c.env.DATABASE_URL, userId);

  // Send account deleted confirmation email
  sendAccountDeletedEmail(
    { apiKey: c.env.RESEND_API_KEY, fromEmail: c.env.RESEND_FROM_EMAIL, fromName: c.env.RESEND_FROM_NAME },
    email,
    name
  ).catch(() => {});

  return c.json({ message: 'Account and all associated data have been permanently deleted' }, 200);
});

export default profileRoutes;
