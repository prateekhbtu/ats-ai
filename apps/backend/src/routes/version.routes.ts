/**
 * Version Routes
 * GET  /api/version/:resume_id
 * POST /api/version/restore
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { getVersionHistory, restoreVersion } from '../services/version.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const versionRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

versionRoutes.use('/*', authMiddleware);

// GET /api/version/:resume_id
versionRoutes.get('/:resume_id', async (c) => {
  const resumeId = c.req.param('resume_id');
  const userId = c.get('userId');

  if (!resumeId || !isValidUUID(resumeId)) {
    throw new ValidationError('Valid resume_id is required');
  }

  const versions = await getVersionHistory(resumeId, userId, c.env.DATABASE_URL);

  return c.json({ versions }, 200);
});

// POST /api/version/restore
versionRoutes.post('/restore', async (c) => {
  const body = await c.req.json<{ version_id?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.version_id || typeof body.version_id !== 'string') {
    throw new ValidationError('version_id is required');
  }

  if (!isValidUUID(body.version_id)) {
    throw new ValidationError('Invalid version_id format');
  }

  const userId = c.get('userId');
  const result = await restoreVersion(body.version_id, userId, c.env);

  return c.json(result, 200);
});

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default versionRoutes;
