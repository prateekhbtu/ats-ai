/**
 * AI Usage Routes – GET /api/usage
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getUsageStatus } from '../services/ai-usage.service.js';

const usageRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

usageRoutes.use('/*', authMiddleware);

// GET /api/usage – current AI usage stats
usageRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const status = await getUsageStatus(userId, c.env.DATABASE_URL);
  return c.json(status, 200);
});

export default usageRoutes;
