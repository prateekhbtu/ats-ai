/**
 * Profile Service – User profile CRUD, account deletion.
 */

import { queryOne, execute } from './db.service.js';
import type { UserRow, UserPublicProfile, ProfileUpdateRequest } from '../types/index.js';
import { NotFoundError, ValidationError } from '../middleware/error-handler.middleware.js';

/**
 * Convert a full UserRow to a public profile (no password_hash).
 */
export function toPublicProfile(user: UserRow): UserPublicProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    phone: user.phone,
    headline: user.headline,
    location: user.location,
    bio: user.bio,
    linkedin_url: user.linkedin_url,
    website_url: user.website_url,
    email_verified: user.email_verified,
    auth_provider: user.auth_provider,
  };
}

/**
 * Get user profile by ID.
 */
export async function getProfile(databaseUrl: string, userId: string): Promise<UserPublicProfile> {
  const user = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return toPublicProfile(user);
}

/**
 * Update user profile fields. Only updates provided fields.
 */
export async function updateProfile(
  databaseUrl: string,
  userId: string,
  data: ProfileUpdateRequest
): Promise<UserPublicProfile> {
  // Build dynamic update query
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const allowedFields: (keyof ProfileUpdateRequest)[] = [
    'name', 'phone', 'headline', 'location', 'bio', 'linkedin_url', 'website_url',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      // Validate string lengths
      const value = data[field];
      if (typeof value !== 'string') {
        throw new ValidationError(`${field} must be a string`);
      }

      if (field === 'name' && value.trim().length < 1) {
        throw new ValidationError('Name cannot be empty');
      }

      if (field === 'name' && value.length > 255) {
        throw new ValidationError('Name must be 255 characters or less');
      }

      if (field === 'headline' && value.length > 500) {
        throw new ValidationError('Headline must be 500 characters or less');
      }

      if (field === 'location' && value.length > 255) {
        throw new ValidationError('Location must be 255 characters or less');
      }

      if (field === 'bio' && value.length > 5000) {
        throw new ValidationError('Bio must be 5000 characters or less');
      }

      if (field === 'phone' && value.length > 50) {
        throw new ValidationError('Phone must be 50 characters or less');
      }

      if ((field === 'linkedin_url' || field === 'website_url') && value.length > 0) {
        if (value.length > 2000) {
          throw new ValidationError(`${field} must be 2000 characters or less`);
        }
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          throw new ValidationError(`${field} must start with http:// or https://`);
        }
      }

      setClauses.push(`${field} = $${paramIndex}`);
      params.push(value.trim());
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  setClauses.push('updated_at = NOW()');
  params.push(userId);

  const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const updated = await queryOne<UserRow>(databaseUrl, sql, params);

  if (!updated) {
    throw new NotFoundError('User not found');
  }

  return toPublicProfile(updated);
}

/**
 * Update profile picture URL.
 */
export async function updateProfilePicture(
  databaseUrl: string,
  userId: string,
  pictureUrl: string
): Promise<UserPublicProfile> {
  const updated = await queryOne<UserRow>(
    databaseUrl,
    `UPDATE users SET picture = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [pictureUrl, userId]
  );

  if (!updated) {
    throw new NotFoundError('User not found');
  }

  return toPublicProfile(updated);
}

/**
 * Remove profile picture (set to empty string).
 */
export async function removeProfilePicture(
  databaseUrl: string,
  userId: string
): Promise<UserPublicProfile> {
  const updated = await queryOne<UserRow>(
    databaseUrl,
    `UPDATE users SET picture = '', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [userId]
  );

  if (!updated) {
    throw new NotFoundError('User not found');
  }

  return toPublicProfile(updated);
}

/**
 * Delete user account and all associated data.
 * Cascade delete handles related rows via FK constraints.
 */
export async function deleteAccount(
  databaseUrl: string,
  userId: string
): Promise<{ email: string; name: string }> {
  const user = await queryOne<UserRow>(
    databaseUrl,
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Delete user (cascade deletes all related data)
  await execute(databaseUrl, `DELETE FROM users WHERE id = $1`, [userId]);

  return { email: user.email, name: user.name };
}

/**
 * Get raw user row (for internal use, includes password_hash etc).
 */
export async function getUserRow(databaseUrl: string, userId: string): Promise<UserRow | null> {
  return queryOne<UserRow>(databaseUrl, `SELECT * FROM users WHERE id = $1`, [userId]);
}
