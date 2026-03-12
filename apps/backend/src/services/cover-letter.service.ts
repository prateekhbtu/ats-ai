/**
 * Cover Letter Service – Generate and manage cover letters.
 */

import { queryOne } from './db.service.js';
import { getResumeById } from './resume-parser.service.js';
import { getJdById } from './jd-parser.service.js';
import { callLlm, getLlmConfig } from './llm.service.js';
import { buildCoverLetterPrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateCoverLetterResponse } from '../utils/response-validator.js';
import { coverLetterSchema } from '../utils/vertex-response-schemas.js';
import type { CoverLetterRow, CoverLetterTone, Env } from '../types/index.js';
import { LlmError, NotFoundError } from '../middleware/error-handler.middleware.js';

export interface CoverLetterResult {
  id: string;
  content: string;
  tone: CoverLetterTone;
  template: string;
  word_count: number;
}

export async function generateCoverLetter(
  resumeId: string,
  jdId: string,
  tone: CoverLetterTone,
  userId: string,
  env: Env,
  template?: string
): Promise<CoverLetterResult> {
  const resume = await getResumeById(resumeId, userId, env.DATABASE_URL);
  const jd = await getJdById(jdId, userId, env.DATABASE_URL);

  const prompt = buildCoverLetterPrompt(resume.sections, jd.extracted_data, tone, template);

  const llmResponse = await callLlm(getLlmConfig(env), {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.5,
    max_tokens: 4096,
    response_schema: coverLetterSchema,
  });

  const parsed = validateJsonResponse<{ content: string; word_count: number }>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to generate cover letter: ${parsed.error}`);
  }

  if (!validateCoverLetterResponse(parsed.data)) {
    throw new LlmError('Generated cover letter is too short or invalid');
  }

  const content = parsed.data.content;
  const templateName = template || 'standard';

  // Store cover letter
  const coverLetter = await queryOne<CoverLetterRow>(
    env.DATABASE_URL,
    `INSERT INTO cover_letters (id, user_id, resume_id, jd_id, tone, template, content)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, resumeId, jdId, tone, templateName, content]
  );

  if (!coverLetter) {
    throw new Error('Failed to save cover letter');
  }

  // Store version snapshot
  await queryOne(
    env.DATABASE_URL,
    `INSERT INTO versions (id, user_id, resume_id, entity_type, entity_id, version_number, content_snapshot)
     VALUES (gen_random_uuid(), $1, $2, 'cover_letter', $3, 1, $4)`,
    [userId, resumeId, coverLetter.id, JSON.stringify({ content, tone, template: templateName })]
  );

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    id: coverLetter.id,
    content,
    tone,
    template: templateName,
    word_count: wordCount,
  };
}

export async function getCoverLetterById(
  coverletterId: string,
  userId: string,
  databaseUrl: string
): Promise<CoverLetterResult> {
  const cl = await queryOne<CoverLetterRow>(
    databaseUrl,
    `SELECT * FROM cover_letters WHERE id = $1 AND user_id = $2`,
    [coverletterId, userId]
  );

  if (!cl) {
    throw new NotFoundError('Cover letter');
  }

  const wordCount = cl.content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    id: cl.id,
    content: cl.content,
    tone: cl.tone,
    template: cl.template,
    word_count: wordCount,
  };
}
