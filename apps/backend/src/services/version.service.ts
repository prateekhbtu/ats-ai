/**
 * Version Service – Track and restore versions of enhanced resumes and cover letters.
 */

import { query, queryOne } from './db.service.js';
import type { VersionRow, Env, ResumeSections } from '../types/index.js';
import { NotFoundError, ValidationError } from '../middleware/error-handler.middleware.js';

export interface VersionListItem {
  id: string;
  entity_type: 'enhanced_resume' | 'cover_letter';
  entity_id: string;
  version_number: number;
  created_at: string;
}

export interface VersionDetail extends VersionListItem {
  content_snapshot: unknown;
}

/**
 * Get version history for a resume's enhanced versions and cover letters.
 */
export async function getVersionHistory(
  resumeId: string,
  userId: string,
  databaseUrl: string
): Promise<VersionListItem[]> {
  const rows = await query<VersionRow>(
    databaseUrl,
    `SELECT id, entity_type, entity_id, version_number, created_at
     FROM versions
     WHERE resume_id = $1 AND user_id = $2
     ORDER BY created_at DESC`,
    [resumeId, userId]
  );

  return rows.map(r => ({
    id: r.id,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    version_number: r.version_number,
    created_at: r.created_at,
  }));
}

/**
 * Get a specific version's content.
 */
export async function getVersionDetail(
  versionId: string,
  userId: string,
  databaseUrl: string
): Promise<VersionDetail> {
  const row = await queryOne<VersionRow>(
    databaseUrl,
    `SELECT * FROM versions WHERE id = $1 AND user_id = $2`,
    [versionId, userId]
  );

  if (!row) {
    throw new NotFoundError('Version');
  }

  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    version_number: row.version_number,
    created_at: row.created_at,
    content_snapshot: typeof row.content_snapshot === 'string' ? JSON.parse(row.content_snapshot) : row.content_snapshot,
  };
}

/**
 * Restore a previous version as the active version.
 */
export async function restoreVersion(
  versionId: string,
  userId: string,
  env: Env
): Promise<{ restored_version: VersionDetail; new_version_id: string }> {
  const version = await getVersionDetail(versionId, userId, env.DATABASE_URL);

  if (version.entity_type === 'enhanced_resume') {
    return restoreEnhancedResume(version, userId, env);
  } else if (version.entity_type === 'cover_letter') {
    return restoreCoverLetter(version, userId, env);
  } else {
    throw new ValidationError(`Unknown entity type: ${version.entity_type}`);
  }
}

async function restoreEnhancedResume(
  version: VersionDetail,
  userId: string,
  env: Env
): Promise<{ restored_version: VersionDetail; new_version_id: string }> {
  const snapshot = version.content_snapshot as { sections: ResumeSections; text: string };

  if (!snapshot.sections || !snapshot.text) {
    throw new ValidationError('Invalid version snapshot for enhanced resume');
  }

  // Get the resume_id from the original enhanced resume
  const original = await queryOne<{ resume_id: string; jd_id: string; analysis_id: string }>(
    env.DATABASE_URL,
    `SELECT resume_id, jd_id, analysis_id FROM enhanced_resumes WHERE id = $1`,
    [version.entity_id]
  );

  if (!original) {
    throw new NotFoundError('Original enhanced resume');
  }

  // Get latest version number
  const latestVersion = await queryOne<{ max_version: number }>(
    env.DATABASE_URL,
    `SELECT COALESCE(MAX(version), 0) as max_version FROM enhanced_resumes WHERE resume_id = $1 AND user_id = $2`,
    [original.resume_id, userId]
  );

  const newVersion = (latestVersion?.max_version || 0) + 1;

  // Create a new enhanced resume entry with the restored content
  const restored = await queryOne<{ id: string }>(
    env.DATABASE_URL,
    `INSERT INTO enhanced_resumes (id, user_id, resume_id, jd_id, analysis_id, version, enhanced_text, enhanced_sections, diff, instructions)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, '[]', $8) RETURNING id`,
    [
      userId,
      original.resume_id,
      original.jd_id,
      original.analysis_id,
      newVersion,
      snapshot.text,
      JSON.stringify(snapshot.sections),
      `Restored from version ${version.version_number}`,
    ]
  );

  if (!restored) {
    throw new Error('Failed to restore version');
  }

  // Create new version entry
  const newVersionEntry = await queryOne<{ id: string }>(
    env.DATABASE_URL,
    `INSERT INTO versions (id, user_id, resume_id, entity_type, entity_id, version_number, content_snapshot)
     VALUES (gen_random_uuid(), $1, $2, 'enhanced_resume', $3, $4, $5) RETURNING id`,
    [userId, original.resume_id, restored.id, newVersion, JSON.stringify(snapshot)]
  );

  return {
    restored_version: version,
    new_version_id: newVersionEntry?.id || restored.id,
  };
}

async function restoreCoverLetter(
  version: VersionDetail,
  userId: string,
  env: Env
): Promise<{ restored_version: VersionDetail; new_version_id: string }> {
  const snapshot = version.content_snapshot as { content: string; tone: string; template: string };

  if (!snapshot.content) {
    throw new ValidationError('Invalid version snapshot for cover letter');
  }

  // Update the original cover letter with restored content
  const updated = await queryOne<{ id: string }>(
    env.DATABASE_URL,
    `UPDATE cover_letters SET content = $1, tone = $2, template = $3, updated_at = NOW()
     WHERE id = $4 AND user_id = $5 RETURNING id`,
    [snapshot.content, snapshot.tone || 'formal', snapshot.template || 'standard', version.entity_id, userId]
  );

  if (!updated) {
    throw new NotFoundError('Cover letter to restore');
  }

  // Get resume_id for the version entry
  const cl = await queryOne<{ resume_id: string }>(
    env.DATABASE_URL,
    `SELECT resume_id FROM cover_letters WHERE id = $1`,
    [version.entity_id]
  );

  // Get true latest version number to avoid conflicts on multiple restores
  const latestCLVersion = await queryOne<{ max_version: number }>(
    env.DATABASE_URL,
    `SELECT COALESCE(MAX(version_number), 0) AS max_version FROM versions
     WHERE entity_id = $1 AND entity_type = 'cover_letter'`,
    [version.entity_id]
  );
  const newVersionNumber = (latestCLVersion?.max_version || 0) + 1;

  // Create new version entry
  const newVersionEntry = await queryOne<{ id: string }>(
    env.DATABASE_URL,
    `INSERT INTO versions (id, user_id, resume_id, entity_type, entity_id, version_number, content_snapshot)
     VALUES (gen_random_uuid(), $1, $2, 'cover_letter', $3, $4, $5) RETURNING id`,
    [userId, cl?.resume_id || '', version.entity_id, newVersionNumber, JSON.stringify(snapshot)]
  );

  return {
    restored_version: version,
    new_version_id: newVersionEntry?.id || version.id,
  };
}
