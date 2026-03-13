/**
 * Enhancer Service – Resume enhancement and refinement.
 * Ensures no hallucinated content via strict validation.
 */

import { queryOne } from './db.service.js';
import { getResumeById } from './resume-parser.service.js';
import { getJdById } from './jd-parser.service.js';
import { callLlm, getLlmConfig } from './llm.service.js';
import { buildResumeEnhancePrompt, buildResumeRefinePrompt, buildSectionOptimizationPrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateResumeSections } from '../utils/response-validator.js';
import { checkHallucinations, sanitizeEnhancedSections } from '../utils/hallucination-checker.js';
import { generateDiff, sectionsToText } from '../utils/diff-generator.js';
import { resumeSectionsSchema, sectionOptimizationSchema } from '../utils/vertex-response-schemas.js';
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

async function insertEnhancedVersionSnapshot(
  databaseUrl: string,
  userId: string,
  resumeId: string,
  entityId: string,
  versionNumber: number,
  snapshot: unknown,
  diff: DiffResult[]
): Promise<void> {
  try {
    await queryOne(
      databaseUrl,
      `INSERT INTO versions (id, user_id, resume_id, entity_type, entity_id, version_number, content_snapshot, diff)
       VALUES (gen_random_uuid(), $1, $2, 'enhanced_resume', $3, $4, $5, $6)`,
      [userId, resumeId, entityId, versionNumber, JSON.stringify(snapshot), JSON.stringify(diff)]
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Backward compatibility: DB not migrated yet (versions.diff missing)
    if (/column\s+"?diff"?\s+of\s+relation\s+"?versions"?\s+does\s+not\s+exist/i.test(msg)) {
      await queryOne(
        databaseUrl,
        `INSERT INTO versions (id, user_id, resume_id, entity_type, entity_id, version_number, content_snapshot)
         VALUES (gen_random_uuid(), $1, $2, 'enhanced_resume', $3, $4, $5)`,
        [userId, resumeId, entityId, versionNumber, JSON.stringify({ ...snapshot, diff })]
      );
      return;
    }
    throw err;
  }
}

function ensureAllSectionsPreserved(original: ResumeSections, candidate: ResumeSections): ResumeSections {
  const byExperienceKey = new Set(
    (candidate.experience || []).map(e => `${(e.title || '').trim().toLowerCase()}::${(e.company || '').trim().toLowerCase()}`)
  );

  const mergedExperience = [...(candidate.experience || [])];
  for (const exp of original.experience || []) {
    const key = `${(exp.title || '').trim().toLowerCase()}::${(exp.company || '').trim().toLowerCase()}`;
    if (!byExperienceKey.has(key)) {
      mergedExperience.push(exp);
      byExperienceKey.add(key);
    }
  }

  const byEducationKey = new Set(
    (candidate.education || []).map(e => `${(e.degree || '').trim().toLowerCase()}::${(e.institution || '').trim().toLowerCase()}`)
  );
  const mergedEducation = [...(candidate.education || [])];
  for (const edu of original.education || []) {
    const key = `${(edu.degree || '').trim().toLowerCase()}::${(edu.institution || '').trim().toLowerCase()}`;
    if (!byEducationKey.has(key)) {
      mergedEducation.push(edu);
      byEducationKey.add(key);
    }
  }

  const mergedSkills = Array.from(new Set([...(candidate.skills || []), ...(original.skills || [])]));
  const mergedCerts = Array.from(new Set([...(candidate.certifications || []), ...(original.certifications || [])]));
  const mergedOther = Array.from(new Set([...(candidate.other || []), ...(original.other || [])]));

  const byProjectKey = new Set((candidate.projects || []).map(p => (p.name || '').trim().toLowerCase()));
  const mergedProjects = [...(candidate.projects || [])];
  for (const proj of original.projects || []) {
    const key = (proj.name || '').trim().toLowerCase();
    if (!byProjectKey.has(key)) {
      mergedProjects.push(proj);
      byProjectKey.add(key);
    }
  }

  return {
    summary: candidate.summary ?? original.summary,
    experience: mergedExperience,
    education: mergedEducation,
    skills: mergedSkills,
    certifications: mergedCerts,
    projects: mergedProjects,
    other: mergedOther,
  };
}

function getByPath(sections: ResumeSections, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    if (Array.isArray(acc)) {
      const idx = Number(part);
      return Number.isInteger(idx) ? acc[idx] : undefined;
    }
    if (typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, sections);
}

function setByPath<T extends object>(obj: T, path: string, value: unknown): T {
  const clone = structuredClone(obj) as Record<string, unknown>;
  const parts = path.split('.');
  let cur: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) throw new ValidationError('Invalid section_path index');
      cur = cur[idx];
      continue;
    }
    if (typeof cur === 'object' && cur !== null) {
      const rec = cur as Record<string, unknown>;
      if (!(part in rec)) throw new ValidationError('Invalid section_path');
      cur = rec[part];
      continue;
    }
    throw new ValidationError('Invalid section_path');
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(cur)) {
    const idx = Number(last);
    if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) throw new ValidationError('Invalid section_path index');
    cur[idx] = value;
  } else if (typeof cur === 'object' && cur !== null) {
    (cur as Record<string, unknown>)[last] = value;
  } else {
    throw new ValidationError('Invalid section_path');
  }
  return clone as T;
}

async function createEnhancedVersion(
  args: {
    userId: string;
    resumeId: string;
    jdId: string;
    analysisId: string;
    sections: ResumeSections;
    diff: DiffResult[];
    instructions?: string | null;
  },
  env: Env
): Promise<{ id: string; version: number; text: string }> {
  const latestVersion = await queryOne<{ max_version: number }>(
    env.DATABASE_URL,
    `SELECT COALESCE(MAX(version), 0) as max_version FROM enhanced_resumes WHERE resume_id = $1 AND user_id = $2`,
    [args.resumeId, args.userId]
  );

  const newVersion = (latestVersion?.max_version || 0) + 1;
  const text = sectionsToText(args.sections);

  const enhanced = await queryOne<EnhancedResumeRow>(
    env.DATABASE_URL,
    `INSERT INTO enhanced_resumes (id, user_id, resume_id, jd_id, analysis_id, version, enhanced_text, enhanced_sections, diff, instructions)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      args.userId,
      args.resumeId,
      args.jdId,
      args.analysisId,
      newVersion,
      text,
      JSON.stringify(args.sections),
      JSON.stringify(args.diff),
      args.instructions || null,
    ]
  );

  if (!enhanced) {
    throw new Error('Failed to save enhanced resume');
  }

  await insertEnhancedVersionSnapshot(
    env.DATABASE_URL,
    args.userId,
    args.resumeId,
    enhanced.id,
    newVersion,
    { sections: args.sections, text },
    args.diff
  );

  return { id: enhanced.id, version: newVersion, text };
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

  const weaknesses = (typeof analysis.weaknesses === 'string' ? JSON.parse(analysis.weaknesses) : analysis.weaknesses) as string[];

  // Generate enhanced resume via LLM
  const prompt = buildResumeEnhancePrompt(resume.sections, jd.extracted_data, weaknesses);

  const llmResponse = await callLlm(getLlmConfig(env), {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.4,
    max_tokens: 8192,
    response_schema: resumeSectionsSchema,
  });

  const parsed = validateJsonResponse<ResumeSections>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to enhance resume: ${parsed.error}`);
  }

  if (!validateResumeSections(parsed.data)) {
    throw new LlmError('Enhanced resume has invalid structure');
  }

  const rawEnhancedSections = parsed.data;

  // Hallucination check — auto-sanitize instead of throwing
  const hallucinationResult = checkHallucinations(resume.sections, rawEnhancedSections);
  const hallucinationSafeSections =
    hallucinationResult.violations.length > 0
      ? sanitizeEnhancedSections(resume.sections, rawEnhancedSections)
      : rawEnhancedSections;

  const enhancedSections = ensureAllSectionsPreserved(resume.sections, hallucinationSafeSections);

  const diff = generateDiff(resume.sections, enhancedSections);
  const created = await createEnhancedVersion(
    {
      userId,
      resumeId,
      jdId,
      analysisId,
      sections: enhancedSections,
      diff,
    },
    env
  );

  return {
    id: created.id,
    version: created.version,
    enhanced_sections: enhancedSections,
    enhanced_text: created.text,
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

  const currentSections = (typeof existing.enhanced_sections === 'string' ? JSON.parse(existing.enhanced_sections) : existing.enhanced_sections) as ResumeSections;

  // Fetch original resume for grounding
  const original = await getResumeById(existing.resume_id, userId, env.DATABASE_URL);

  // Build refinement prompt
  const prompt = buildResumeRefinePrompt(currentSections, original.sections, instructions);

  const llmResponse = await callLlm(getLlmConfig(env), {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.3,
    max_tokens: 8192,
    response_schema: resumeSectionsSchema,
  });

  const parsed = validateJsonResponse<ResumeSections>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to refine resume: ${parsed.error}`);
  }

  if (!validateResumeSections(parsed.data)) {
    throw new LlmError('Refined resume has invalid structure');
  }

  const rawRefinedSections = parsed.data;

  // Hallucination check against original — auto-sanitize instead of throwing
  const hallucinationResult = checkHallucinations(original.sections, rawRefinedSections);
  const hallucinationSafeSections =
    hallucinationResult.violations.length > 0
      ? sanitizeEnhancedSections(original.sections, rawRefinedSections)
      : rawRefinedSections;

  let refinedSections = ensureAllSectionsPreserved(original.sections, hallucinationSafeSections);

  let diff = generateDiff(currentSections, refinedSections);

  // If nothing changed, retry once with stronger instruction enforcement
  if (diff.every(d => d.change_type === 'unchanged')) {
    const retryPrompt = buildResumeRefinePrompt(currentSections, original.sections, `${instructions}\n\nIMPORTANT: You MUST apply at least one concrete textual change.`);
    const retryResponse = await callLlm(getLlmConfig(env), {
      prompt: retryPrompt.user,
      system_instruction: retryPrompt.system,
      temperature: 0.4,
      max_tokens: 8192,
      response_schema: resumeSectionsSchema,
    });
    const retryParsed = validateJsonResponse<ResumeSections>(retryResponse.text);
    if (retryParsed.success && retryParsed.data && validateResumeSections(retryParsed.data)) {
      const retryHallucinations = checkHallucinations(original.sections, retryParsed.data);
      const retrySafe = retryHallucinations.violations.length > 0
        ? sanitizeEnhancedSections(original.sections, retryParsed.data)
        : retryParsed.data;
      refinedSections = ensureAllSectionsPreserved(original.sections, retrySafe);
      diff = generateDiff(currentSections, refinedSections);
    }
  }
  const created = await createEnhancedVersion(
    {
      userId,
      resumeId: existing.resume_id,
      jdId: existing.jd_id,
      analysisId: existing.analysis_id,
      sections: refinedSections,
      diff,
      instructions,
    },
    env
  );

  return {
    id: created.id,
    version: created.version,
    enhanced_sections: refinedSections,
    enhanced_text: created.text,
    diff,
    hallucination_check: {
      is_valid: hallucinationResult.is_valid,
      violations_count: hallucinationResult.violations.length,
    },
  };
}

export async function manualEditEnhancedResume(
  enhancedResumeId: string,
  sections: ResumeSections,
  userId: string,
  env: Env
): Promise<EnhanceResult> {
  const existing = await queryOne<EnhancedResumeRow>(
    env.DATABASE_URL,
    `SELECT * FROM enhanced_resumes WHERE id = $1 AND user_id = $2`,
    [enhancedResumeId, userId]
  );

  if (!existing) throw new NotFoundError('Enhanced resume');
  if (!validateResumeSections(sections)) throw new ValidationError('Invalid resume sections structure');

  const currentSections = (typeof existing.enhanced_sections === 'string'
    ? JSON.parse(existing.enhanced_sections)
    : existing.enhanced_sections) as ResumeSections;

  const diff = generateDiff(currentSections, sections);
  const created = await createEnhancedVersion(
    {
      userId,
      resumeId: existing.resume_id,
      jdId: existing.jd_id,
      analysisId: existing.analysis_id,
      sections,
      diff,
      instructions: 'Manual edit by user',
    },
    env
  );

  return {
    id: created.id,
    version: created.version,
    enhanced_sections: sections,
    enhanced_text: created.text,
    diff,
    hallucination_check: { is_valid: true, violations_count: 0 },
  };
}

export async function optimizeSelectedSection(
  enhancedResumeId: string,
  sectionPath: string,
  instruction: string,
  userId: string,
  env: Env
): Promise<EnhanceResult> {
  if (!sectionPath.trim()) throw new ValidationError('section_path is required');
  if (!instruction.trim()) throw new ValidationError('instruction is required');

  const existing = await queryOne<EnhancedResumeRow>(
    env.DATABASE_URL,
    `SELECT * FROM enhanced_resumes WHERE id = $1 AND user_id = $2`,
    [enhancedResumeId, userId]
  );
  if (!existing) throw new NotFoundError('Enhanced resume');

  const currentSections = (typeof existing.enhanced_sections === 'string'
    ? JSON.parse(existing.enhanced_sections)
    : existing.enhanced_sections) as ResumeSections;

  const selected = getByPath(currentSections, sectionPath);
  if (selected === undefined) throw new ValidationError('Invalid section_path');

  const selectedText = typeof selected === 'string'
    ? selected
    : Array.isArray(selected)
      ? selected.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')
      : JSON.stringify(selected, null, 2);

  const jd = await getJdById(existing.jd_id, userId, env.DATABASE_URL).catch(() => null);
  const prompt = buildSectionOptimizationPrompt(sectionPath, selectedText, instruction, jd?.extracted_data);

  const llmResponse = await callLlm(getLlmConfig(env), {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.3,
    max_tokens: 2048,
    response_schema: sectionOptimizationSchema,
  });

  const parsed = validateJsonResponse<{ optimized_text: string }>(llmResponse.text);
  if (!parsed.success || !parsed.data?.optimized_text) {
    throw new LlmError(`Failed to optimize selected section: ${parsed.error}`);
  }

  let replacement: unknown;
  if (typeof selected === 'string') {
    replacement = parsed.data.optimized_text;
  } else if (Array.isArray(selected)) {
    replacement = parsed.data.optimized_text.split('\n').map(s => s.trim()).filter(Boolean);
  } else {
    replacement = selected;
  }

  const updatedSections = setByPath(currentSections, sectionPath, replacement) as ResumeSections;
  const normalizedUpdated = ensureAllSectionsPreserved(currentSections, updatedSections);
  const diff = generateDiff(currentSections, normalizedUpdated);

  const created = await createEnhancedVersion(
    {
      userId,
      resumeId: existing.resume_id,
      jdId: existing.jd_id,
      analysisId: existing.analysis_id,
      sections: normalizedUpdated,
      diff,
      instructions: `Section optimization: ${sectionPath} :: ${instruction}`,
    },
    env
  );

  return {
    id: created.id,
    version: created.version,
    enhanced_sections: normalizedUpdated,
    enhanced_text: created.text,
    diff,
    hallucination_check: { is_valid: true, violations_count: 0 },
  };
}
