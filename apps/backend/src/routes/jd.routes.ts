/**
 * JD Routes – POST /api/jd/process
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { processJobDescription } from '../services/jd-parser.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const jdRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

jdRoutes.use('/*', authMiddleware);

// POST /api/jd/process
jdRoutes.post('/process', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{ text?: string; url?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.text && !body.url) {
    throw new ValidationError('Either "text" (job description) or "url" (job posting URL) is required');
  }

  if (body.text && typeof body.text !== 'string') {
    throw new ValidationError('"text" must be a string');
  }

  if (body.url && typeof body.url !== 'string') {
    throw new ValidationError('"url" must be a string');
  }

  if (body.url) {
    try {
      new URL(body.url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }
  }

  if (body.text && body.text.trim().length < 30) {
    throw new ValidationError('Job description text is too short (minimum 30 characters)');
  }

  const userId = c.get('userId');
  const result = await processJobDescription(
    { text: body.text, url: body.url },
    userId,
    c.env
  );

  return c.json(result, 201);
});

export default jdRoutes;
