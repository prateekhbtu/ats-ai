/**
 * Resume Routes
 * GET  /api/resume/list
 * POST /api/resume/upload
 * POST /api/resume/score
 * GET  /api/resume/:id
 * DELETE /api/resume/:id
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { uploadAndParseResume, getResumeById, deleteResume, listResumes, scoreResumeStandalone } from '../services/resume-parser.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const resumeRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// All resume routes require authentication
resumeRoutes.use('/*', authMiddleware);

// GET /api/resume/list — List all resumes for the authenticated user
resumeRoutes.get('/list', async (c) => {
  const userId = c.get('userId');
  const resumes = await listResumes(userId, c.env.DATABASE_URL);
  return c.json({ resumes }, 200);
});

// POST /api/resume/upload
resumeRoutes.post('/upload', llmRateLimiter(), async (c) => {
  const contentType = c.req.header('Content-Type') || '';

  let fileBuffer: ArrayBuffer;
  let fileName: string;

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      throw new ValidationError('File is required. Upload a PDF or DOCX file.');
    }

    const uploadedFile = file as unknown as { name: string; arrayBuffer(): Promise<ArrayBuffer> };
    fileName = uploadedFile.name;
    fileBuffer = await uploadedFile.arrayBuffer();
  } else {
    // Support raw binary upload with filename in header
    fileName = c.req.header('X-Filename') || 'resume.pdf';
    fileBuffer = await c.req.arrayBuffer();
  }

  if (fileBuffer.byteLength === 0) {
    throw new ValidationError('Uploaded file is empty');
  }

  if (fileBuffer.byteLength > 10 * 1024 * 1024) {
    throw new ValidationError('File size exceeds 10MB limit');
  }

  const ext = fileName.toLowerCase().split('.').pop();
  if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
    throw new ValidationError('Only PDF and DOCX files are supported');
  }

  const userId = c.get('userId');
  const result = await uploadAndParseResume(fileBuffer, fileName, userId, c.env);

  return c.json(result, 201);
});

// POST /api/resume/score — ATS score a resume standalone (no JD required)
resumeRoutes.post('/score', async (c) => {
  const body = await c.req.json<{ resume_id?: string }>().catch(() => null);

  if (!body || !body.resume_id || !isValidUUID(body.resume_id)) {
    throw new ValidationError('Valid resume_id is required');
  }

  const userId = c.get('userId');
  const result = await scoreResumeStandalone(body.resume_id, userId, c.env.DATABASE_URL);

  return c.json(result, 200);
});

// GET /api/resume/:id
resumeRoutes.get('/:id', async (c) => {
  const resumeId = c.req.param('id');
  const userId = c.get('userId');

  if (!resumeId || !isValidUUID(resumeId)) {
    throw new ValidationError('Valid resume ID is required');
  }

  const resume = await getResumeById(resumeId, userId, c.env.DATABASE_URL);

  return c.json(resume, 200);
});

// DELETE /api/resume/:id
resumeRoutes.delete('/:id', async (c) => {
  const resumeId = c.req.param('id');
  const userId = c.get('userId');

  if (!resumeId || !isValidUUID(resumeId)) {
    throw new ValidationError('Valid resume ID is required');
  }

  const supabaseConfig = c.env.SUPABASE_URL && c.env.SUPABASE_SECRET_KEY
    ? { supabaseUrl: c.env.SUPABASE_URL, supabaseSecretKey: c.env.SUPABASE_SECRET_KEY }
    : undefined;

  await deleteResume(resumeId, userId, c.env.DATABASE_URL, supabaseConfig);

  return c.json({ message: 'Resume deleted successfully' }, 200);
});

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default resumeRoutes;
