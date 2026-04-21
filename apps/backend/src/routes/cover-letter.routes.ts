/**
 * Cover Letter Routes – POST /api/cover-letter/generate
 */

import { Hono } from 'hono';
import type { Env, AppVariables, CoverLetterTone } from '../types/index.js';
import { generateCoverLetter, getCoverLetterById } from '../services/cover-letter.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const coverLetterRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

coverLetterRoutes.use('/*', authMiddleware);

const VALID_TONES: CoverLetterTone[] = ['formal', 'conversational', 'assertive', 'enthusiastic'];

// GET /api/cover-letter/list – All cover letters for the current user
coverLetterRoutes.get('/list', async (c) => {
  const userId = c.get('userId');
  const { query } = await import('../services/db.service.js');
  const rows = await query<{ id: string; tone: string; created_at: string; updated_at: string }>(
    c.env.DATABASE_URL,
    `SELECT id, tone, created_at, updated_at FROM cover_letters WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return c.json({ cover_letters: rows }, 200);
});

// POST /api/cover-letter/generate
coverLetterRoutes.post('/generate', llmRateLimiter(), async (c) => {
  const body = await c.req.json<{
    resume_id?: string;
    jd_id?: string;
    tone?: string;
    template?: string;
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

  if (!body.tone || !VALID_TONES.includes(body.tone as CoverLetterTone)) {
    throw new ValidationError(`tone is required and must be one of: ${VALID_TONES.join(', ')}`);
  }

  if (!isValidUUID(body.resume_id) || !isValidUUID(body.jd_id)) {
    throw new ValidationError('Invalid ID format');
  }

  if (body.template && typeof body.template !== 'string') {
    throw new ValidationError('template must be a string');
  }

  const userId = c.get('userId');

  // Enforce freemium AI limit
  const { enforceAiLimit } = await import('../services/ai-usage.service.js');
  await enforceAiLimit(userId, 'cover_letter_generate', c.env.DATABASE_URL, c.env.FREE_TIER_LIMIT ? parseInt(c.env.FREE_TIER_LIMIT, 10) : undefined);

  const result = await generateCoverLetter(
    body.resume_id,
    body.jd_id,
    body.tone as CoverLetterTone,
    userId,
    c.env,
    body.template
  );

  return c.json(result, 201);
});

// GET /api/cover-letter/:id
coverLetterRoutes.get('/:id', async (c) => {
  const clId = c.req.param('id');
  const userId = c.get('userId');

  if (!clId || !isValidUUID(clId)) {
    throw new ValidationError('Valid cover letter id is required');
  }

  const result = await getCoverLetterById(clId, userId, c.env.DATABASE_URL);
  return c.json(result, 200);
});

// PUT /api/cover-letter/:id – Manual edit
coverLetterRoutes.put('/:id', async (c) => {
  const clId = c.req.param('id');
  const userId = c.get('userId');

  if (!clId || !isValidUUID(clId)) {
    throw new ValidationError('Valid cover letter id is required');
  }

  const body = await c.req.json<{ content?: string }>().catch(() => null);
  if (!body || !body.content || typeof body.content !== 'string') {
    throw new ValidationError('content is required');
  }

  const { updateCoverLetterContent } = await import('../services/cover-letter.service.js');
  const result = await updateCoverLetterContent(clId, body.content, userId, c.env.DATABASE_URL);
  return c.json(result, 200);
});

// POST /api/cover-letter/:id/refine – AI refinement
coverLetterRoutes.post('/:id/refine', llmRateLimiter(), async (c) => {
  const clId = c.req.param('id');
  const userId = c.get('userId');

  if (!clId || !isValidUUID(clId)) {
    throw new ValidationError('Valid cover letter id is required');
  }

  const body = await c.req.json<{ instruction?: string }>().catch(() => null);
  if (!body || !body.instruction || typeof body.instruction !== 'string') {
    throw new ValidationError('instruction is required');
  }

  // Enforce freemium AI limit
  const { enforceAiLimit } = await import('../services/ai-usage.service.js');
  await enforceAiLimit(userId, 'cover_letter_refine', c.env.DATABASE_URL, c.env.FREE_TIER_LIMIT ? parseInt(c.env.FREE_TIER_LIMIT, 10) : undefined);

  const { refineCoverLetter } = await import('../services/cover-letter.service.js');
  const result = await refineCoverLetter(clId, body.instruction, userId, c.env);
  return c.json(result, 200);
});

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default coverLetterRoutes;
