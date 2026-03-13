/**
 * Enhancer Routes
 * POST /api/enhancer/resume
 * POST /api/enhancer/refine
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { enhanceResume, refineResume, manualEditEnhancedResume, optimizeSelectedSection } from '../services/enhancer.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const enhancerRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

enhancerRoutes.use('/*', authMiddleware);

// POST /api/enhancer/resume
enhancerRoutes.post('/resume', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{
    resume_id?: string;
    jd_id?: string;
    analysis_id?: string;
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

  if (!body.analysis_id || typeof body.analysis_id !== 'string') {
    throw new ValidationError('analysis_id is required');
  }

  if (!isValidUUID(body.resume_id) || !isValidUUID(body.jd_id) || !isValidUUID(body.analysis_id)) {
    throw new ValidationError('Invalid ID format');
  }

  const userId = c.get('userId');
  const result = await enhanceResume(
    body.resume_id,
    body.jd_id,
    body.analysis_id,
    userId,
    c.env
  );

  return c.json(result, 200);
});

// POST /api/enhancer/refine
enhancerRoutes.post('/refine', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{
    enhanced_resume_id?: string;
    instructions?: string;
  }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.enhanced_resume_id || typeof body.enhanced_resume_id !== 'string') {
    throw new ValidationError('enhanced_resume_id is required');
  }

  if (!body.instructions || typeof body.instructions !== 'string') {
    throw new ValidationError('instructions is required and must be a string');
  }

  if (body.instructions.trim().length < 5) {
    throw new ValidationError('Instructions must be at least 5 characters');
  }

  if (body.instructions.length > 1000) {
    throw new ValidationError('Instructions must not exceed 1000 characters');
  }

  if (!isValidUUID(body.enhanced_resume_id)) {
    throw new ValidationError('Invalid enhanced_resume_id format');
  }

  const userId = c.get('userId');
  const result = await refineResume(
    body.enhanced_resume_id,
    body.instructions,
    userId,
    c.env
  );

  return c.json(result, 200);
});

// POST /api/enhancer/manual-edit
enhancerRoutes.post('/manual-edit', async (c) => {
  const body = await c.req.json<{ enhanced_resume_id?: string; sections?: unknown }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }
  if (!body.enhanced_resume_id || typeof body.enhanced_resume_id !== 'string') {
    throw new ValidationError('enhanced_resume_id is required');
  }
  if (!isValidUUID(body.enhanced_resume_id)) {
    throw new ValidationError('Invalid enhanced_resume_id format');
  }
  if (!body.sections || typeof body.sections !== 'object') {
    throw new ValidationError('sections is required');
  }

  const userId = c.get('userId');
  const result = await manualEditEnhancedResume(
    body.enhanced_resume_id,
    body.sections as import('../types/index.js').ResumeSections,
    userId,
    c.env
  );

  return c.json(result, 200);
});

// POST /api/enhancer/optimize-section
enhancerRoutes.post('/optimize-section', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{
    enhanced_resume_id?: string;
    section_path?: string;
    instruction?: string;
  }>().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }
  if (!body.enhanced_resume_id || typeof body.enhanced_resume_id !== 'string') {
    throw new ValidationError('enhanced_resume_id is required');
  }
  if (!isValidUUID(body.enhanced_resume_id)) {
    throw new ValidationError('Invalid enhanced_resume_id format');
  }
  if (!body.section_path || typeof body.section_path !== 'string') {
    throw new ValidationError('section_path is required');
  }
  if (!body.instruction || typeof body.instruction !== 'string' || body.instruction.trim().length < 3) {
    throw new ValidationError('instruction is required and must be at least 3 characters');
  }

  const userId = c.get('userId');
  const result = await optimizeSelectedSection(
    body.enhanced_resume_id,
    body.section_path,
    body.instruction,
    userId,
    c.env
  );

  return c.json(result, 200);
});

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default enhancerRoutes;
