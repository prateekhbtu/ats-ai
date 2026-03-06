/**
 * Writing Routes – POST /api/writing/analyze
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { analyzeWriting } from '../services/writing.service.js';
import { getLlmConfig } from '../services/llm.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const writingRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

writingRoutes.use('/*', authMiddleware);

// POST /api/writing/analyze
writingRoutes.post('/analyze', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{ text?: string }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.text || typeof body.text !== 'string') {
    throw new ValidationError('text is required and must be a string');
  }

  if (body.text.trim().length < 20) {
    throw new ValidationError('Text must be at least 20 characters for analysis');
  }

  if (body.text.length > 50000) {
    throw new ValidationError('Text must not exceed 50000 characters');
  }

  const result = await analyzeWriting(body.text, getLlmConfig(c.env));

  return c.json(result, 200);
});

export default writingRoutes;
