/**
 * Resume Routes
 * POST /api/resume/upload
 * GET  /api/resume/:id
 */

import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/index.js';
import { uploadAndParseResume, getResumeById } from '../services/resume-parser.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { llmRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

const resumeRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// All resume routes require authentication
resumeRoutes.use('/*', authMiddleware);

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

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default resumeRoutes;
