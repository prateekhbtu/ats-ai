/**
 * Enhancer Service – Resume enhancement and refinement.
 * Ensures no hallucinated content via strict validation.
 */

import { queryOne } from './db.service.js';
import { getResumeById } from './resume-parser.service.js';
import { getJdById } from './jd-parser.service.js';
import { callLlm } from './llm.service.js';
import { buildResumeEnhancePrompt, buildResumeRefinePrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateResumeSections } from '../utils/response-validator.js';
import { checkHallucinations } from '../utils/hallucination-checker.js';
import { generateDiff, sectionsToText } from '../utils/diff-generator.js';
import type { EnhancedResumeRow, ResumeSections, Env, DiffResult } from '../types/index.js';
import { ValidationError, NotFoundError, LlmError } from '../middleware/error-handler.middleware.js';

export interface EnhanceResult {
  id: string;
  version: number;
  enhanced_sections: ResumeSections;
  enhanced_text: string;
  diff: DiffResult[];
  hallucination_check: {
    is_valid: boolean;
    violations_count: number;
  };
}

export async function enhanceResume(
  resumeId: string,
  jdId: string,
  analysisId: string,
  userId: string,
  env: Env
): Promise<EnhanceResult> {
  const resume = await getResumeById(resumeId, userId, env.DATABASE_URL);
  const jd = await getJdById(jdId, userId, env.DATABASE_URL);

  // Fetch weaknesses from analysis
  const analysis = await queryOne<{ weaknesses: string }>(
    env.DATABASE_URL,
    `SELECT weaknesses FROM analyses WHERE id = $1 AND user_id = $2`,
    [analysisId, userId]
  );

  if (!analysis) {
    throw new NotFoundError('Analysis');
  }

  const weaknesses = JSON.parse(analysis.weaknesses) as string[];

  // Generate enhanced resume via LLM
  const prompt = buildResumeEnhancePrompt(resume.sections, jd.extracted_data, weaknesses);

  const llmResponse = await callLlm(env.GEMINI_API_KEY, {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.4,
    max_tokens: 8192,
  });

  const parsed = validateJsonResponse<ResumeSections>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to enhance resume: ${parsed.error}`);
  }

  if (!validateResumeSections(parsed.data)) {
    throw new LlmError('Enhanced resume has invalid structure');
  }

  const enhancedSections = parsed.data;

  // Hallucination check
  const hallucinationResult = checkHallucinations(resume.sections, enhancedSections);

  if (!hallucinationResult.is_valid && hallucinationResult.violations.length > 3) {
    throw new LlmError(
      `Enhancement contains too many fabricated elements: ${hallucinationResult.violations.map(v => v.description).join('; ')}`
    );
  }

  // Generate diff
  const diff = generateDiff(resume.sections, enhancedSections);
  const enhancedText = sectionsToText(enhancedSections);

  // Get current version number
  const latestVersion = await queryOne<{ max_version: number }>(
    env.DATABASE_URL,
    `SELECT COALESCE(MAX(version), 0) as max_version FROM enhanced_resumes WHERE resume_id = $1 AND user_id = $2`,
    [resumeId, userId]
  );

  const newVersion = (latestVersion?.max_version || 0) + 1;

  // Store enhanced resume
  const enhanced = await queryOne<EnhancedResumeRow>(
    env.DATABASE_URL,
    `INSERT INTO enhanced_resumes (id, user_id, resume_id, jd_id, analysis_id, version, enhanced_text, enhanced_sections, diff)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      userId,
      resumeId,
      jdId,
      analysisId,
      newVersion,
      enhancedText,
      JSON.stringify(enhancedSections),
      JSON.stringify(diff),
    ]
  );

  if (!enhanced) {
    throw new Error('Failed to save enhanced resume');
  }

  // Store version snapshot
  await queryOne(
    env.DATABASE_URL,
    `INSERT INTO versions (id, user_id, resume_id, entity_type, entity_id, version_number, content_snapshot)
     VALUES (gen_random_uuid(), $1, $2, 'enhanced_resume', $3, $4, $5)`,
    [userId, resumeId, enhanced.id, newVersion, JSON.stringify({ sections: enhancedSections, text: enhancedText })]
  );

  return {
    id: enhanced.id,
    version: newVersion,
    enhanced_sections: enhancedSections,
    enhanced_text: enhancedText,
    diff,
    hallucination_check: {
      is_valid: hallucinationResult.is_valid,
      violations_count: hallucinationResult.violations.length,
    },
  };
}

export async function refineResume(
  enhancedResumeId: string,
  instructions: string,
  userId: string,
  env: Env
): Promise<EnhanceResult> {
  if (!instructions || instructions.trim().length < 5) {
    throw new ValidationError('Refinement instructions must be at least 5 characters');
  }

  // Fetch existing enhanced resume
  const existing = await queryOne<EnhancedResumeRow>(
    env.DATABASE_URL,
    `SELECT * FROM enhanced_resumes WHERE id = $1 AND user_id = $2`,
    [enhancedResumeId, userId]
  );

  if (!existing) {
    throw new NotFoundError('Enhanced resume');
  }

  const currentSections = JSON.parse(existing.enhanced_sections) as ResumeSections;

  // Fetch original resume for grounding
  const original = await getResumeById(existing.resume_id, userId, env.DATABASE_URL);

  // Build refinement prompt
  const prompt = buildResumeRefinePrompt(currentSections, original.sections, instructions);

  const llmResponse = await callLlm(env.GEMINI_API_KEY, {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.3,
    max_tokens: 8192,
  });

  const parsed = validateJsonResponse<ResumeSections>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to refine resume: ${parsed.error}`);
  }

  if (!validateResumeSections(parsed.data)) {
    throw new LlmError('Refined resume has invalid structure');
  }

  const refinedSections = parsed.data;

  // Hallucination check against original
  const hallucinationResult = checkHallucinations(original.sections, refinedSections);

  if (!hallucinationResult.is_valid && hallucinationResult.violations.length > 3) {
    throw new LlmError(
      `Refinement contains fabricated elements: ${hallucinationResult.violations.map(v => v.description).join('; ')}`
    );
  }

  const diff = generateDiff(original.sections, refinedSections);
  const refinedText = sectionsToText(refinedSections);

  // Increment version
  const latestVersion = await queryOne<{ max_version: number }>(
    env.DATABASE_URL,
    `SELECT COALESCE(MAX(version), 0) as max_version FROM enhanced_resumes WHERE resume_id = $1 AND user_id = $2`,
    [existing.resume_id, userId]
  );

  const newVersion = (latestVersion?.max_version || 0) + 1;

  const refined = await queryOne<EnhancedResumeRow>(
    env.DATABASE_URL,
    `INSERT INTO enhanced_resumes (id, user_id, resume_id, jd_id, analysis_id, version, enhanced_text, enhanced_sections, diff, instructions)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      userId,
      existing.resume_id,
      existing.jd_id,
      existing.analysis_id,
      newVersion,
      refinedText,
      JSON.stringify(refinedSections),
      JSON.stringify(diff),
      instructions,
    ]
  );

  if (!refined) {
    throw new Error('Failed to save refined resume');
  }

  // Store version snapshot
  await queryOne(
    env.DATABASE_URL,
    `INSERT INTO versions (id, user_id, resume_id, entity_type, entity_id, version_number, content_snapshot)
     VALUES (gen_random_uuid(), $1, $2, 'enhanced_resume', $3, $4, $5)`,
    [userId, existing.resume_id, refined.id, newVersion, JSON.stringify({ sections: refinedSections, text: refinedText })]
  );

  return {
    id: refined.id,
    version: newVersion,
    enhanced_sections: refinedSections,
    enhanced_text: refinedText,
    diff,
    hallucination_check: {
      is_valid: hallucinationResult.is_valid,
      violations_count: hallucinationResult.violations.length,
    },
  };
}
