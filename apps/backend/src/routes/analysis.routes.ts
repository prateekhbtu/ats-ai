/**
 * Analysis Routes – POST /api/analysis/uniscore
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { computeAndStoreUniScore } from '../services/uniscore.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const analysisRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

analysisRoutes.use('/*', authMiddleware);

// POST /api/analysis/uniscore
analysisRoutes.post('/uniscore', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{ resume_id?: string; jd_id?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.resume_id || typeof body.resume_id !== 'string') {
    throw new ValidationError('resume_id is required and must be a string');
  }

  if (!body.jd_id || typeof body.jd_id !== 'string') {
    throw new ValidationError('jd_id is required and must be a string');
  }

  if (!isValidUUID(body.resume_id)) {
    throw new ValidationError('Invalid resume_id format');
  }

  if (!isValidUUID(body.jd_id)) {
    throw new ValidationError('Invalid jd_id format');
  }

  const userId = c.get('userId');
  const result = await computeAndStoreUniScore(
    body.resume_id,
    body.jd_id,
    userId,
    c.env
  );

  return c.json(result, 200);
});

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default analysisRoutes;
