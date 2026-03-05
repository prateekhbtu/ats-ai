/**
 * Interview Routes – POST /api/interview/generate
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { generateInterviewQuestions } from '../services/interview.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const interviewRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

interviewRoutes.use('/*', authMiddleware);

// POST /api/interview/generate
interviewRoutes.post('/generate', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{
    resume_id?: string;
    jd_id?: string;
  }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.resume_id || typeof body.resume_id !== 'string') {
    throw new ValidationError('resume_id is required');
  }

  if (!body.jd_id || typeof body.jd_id !== 'string') {
    throw new ValidationError('jd_id is required');
  }

  if (!isValidUUID(body.resume_id) || !isValidUUID(body.jd_id)) {
    throw new ValidationError('Invalid ID format');
  }

  const userId = c.get('userId');
  const result = await generateInterviewQuestions(
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

export default interviewRoutes;
