/**
 * UniScore Service – Orchestrates the deterministic ATS scoring pipeline.
 * Combines scoring engine with LLM-generated strengths/weaknesses.
 */

import { queryOne } from './db.service.js';
import { getResumeById } from './resume-parser.service.js';
import { getJdById } from './jd-parser.service.js';
import { callLlm } from './llm.service.js';
import { computeUniScore } from '../utils/scoring-engine.js';
import { buildStrengthsWeaknessesPrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateStrengthsWeaknesses } from '../utils/response-validator.js';
import type { AnalysisRow, UniScoreResult, Env } from '../types/index.js';
import { LlmError } from '../middleware/error-handler.middleware.js';

export async function computeAndStoreUniScore(
  resumeId: string,
  jdId: string,
  userId: string,
  env: Env
): Promise<UniScoreResult & { analysis_id: string }> {
  // Fetch resume and JD
  const resume = await getResumeById(resumeId, userId, env.DATABASE_URL);
  const jd = await getJdById(jdId, userId, env.DATABASE_URL);

  // Step 1-8: Compute deterministic UniScore
  const scoringResult = computeUniScore(resume.raw_text, resume.sections, jd.extracted_data);

  // LLM-assisted: Generate qualitative strengths and weaknesses
  const { strengths, weaknesses } = await generateStrengthsWeaknesses(
    resume.sections,
    jd.extracted_data,
    scoringResult.breakdown,
    env.GEMINI_API_KEY
  );

  // Store analysis
  const analysis = await queryOne<AnalysisRow>(
    env.DATABASE_URL,
    `INSERT INTO analyses (id, user_id, resume_id, jd_id, uniscore, breakdown, strengths, weaknesses)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId,
      resumeId,
      jdId,
      scoringResult.uniscore,
      JSON.stringify(scoringResult.breakdown),
      JSON.stringify(strengths),
      JSON.stringify(weaknesses),
    ]
  );

  if (!analysis) {
    throw new Error('Failed to save analysis');
  }

  return {
    analysis_id: analysis.id,
    uniscore: scoringResult.uniscore,
    breakdown: scoringResult.breakdown,
    strengths,
    weaknesses,
  };
}

async function generateStrengthsWeaknesses(
  sections: import('../types/index.js').ResumeSections,
  jdData: import('../types/index.js').JdExtractedData,
  breakdown: import('../types/index.js').ScoreBreakdown,
  apiKey: string
): Promise<{ strengths: string[]; weaknesses: string[] }> {
  try {
    const prompt = buildStrengthsWeaknessesPrompt(sections, jdData, breakdown);

    const llmResponse = await callLlm(apiKey, {
      prompt: prompt.user,
      system_instruction: prompt.system,
      temperature: 0.3,
      max_tokens: 2048,
    });

    const parsed = validateJsonResponse<{ strengths: string[]; weaknesses: string[] }>(llmResponse.text);

    if (parsed.success && parsed.data && validateStrengthsWeaknesses(parsed.data)) {
      return {
        strengths: parsed.data.strengths.slice(0, 7),
        weaknesses: parsed.data.weaknesses.slice(0, 7),
      };
    }

    // Fallback to deterministic generation
    return generateDeterministicFeedback(sections, jdData, breakdown);
  } catch (err) {
    // If LLM fails, generate deterministic feedback
    console.error('LLM strengths/weaknesses generation failed, using deterministic fallback:', err);
    return generateDeterministicFeedback(sections, jdData, breakdown);
  }
}

function generateDeterministicFeedback(
  sections: import('../types/index.js').ResumeSections,
  _jdData: import('../types/index.js').JdExtractedData,
  breakdown: import('../types/index.js').ScoreBreakdown
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Keyword analysis
  if (breakdown.keyword_match >= 70) {
    strengths.push('Strong keyword alignment with the job description');
  } else if (breakdown.keyword_match < 40) {
    weaknesses.push('Low keyword match – resume may not pass ATS keyword filters');
  } else {
    weaknesses.push('Moderate keyword overlap – consider incorporating more JD-specific terminology');
  }

  // Market alignment
  if (breakdown.market_alignment >= 70) {
    strengths.push('Resume aligns well with market standards for this role');
  } else {
    weaknesses.push('Resume could better reflect industry-standard expectations for this role');
  }

  // Section completeness
  if (breakdown.section_completeness >= 80) {
    strengths.push('Resume has all expected sections with good content depth');
  } else if (breakdown.section_completeness < 50) {
    weaknesses.push('Resume is missing key sections expected by ATS systems');
  }

  // Readability
  if (breakdown.readability >= 70) {
    strengths.push('Good readability with clear, concise language');
  } else {
    weaknesses.push('Writing could be more concise and impactful');
  }

  // Experience depth
  if (breakdown.experience_depth >= 70) {
    strengths.push('Experience section demonstrates good depth with quantified achievements');
  } else if (breakdown.experience_depth < 40) {
    weaknesses.push('Experience section lacks depth – add more detail and quantified results');
  }

  // Specific checks
  if (sections.experience.length >= 2) {
    strengths.push(`Includes ${sections.experience.length} relevant work experiences`);
  }

  if (sections.skills.length >= 5) {
    strengths.push(`Lists ${sections.skills.length} skills relevant to the position`);
  } else {
    weaknesses.push('Skills section could be expanded');
  }

  if (!sections.summary) {
    weaknesses.push('Missing professional summary – this is important for ATS scoring');
  }

  return {
    strengths: strengths.slice(0, 7),
    weaknesses: weaknesses.slice(0, 7),
  };
}

export async function getAnalysisById(
  analysisId: string,
  userId: string,
  databaseUrl: string
): Promise<UniScoreResult & { analysis_id: string }> {
  const analysis = await queryOne<AnalysisRow>(
    databaseUrl,
    `SELECT * FROM analyses WHERE id = $1 AND user_id = $2`,
    [analysisId, userId]
  );

  if (!analysis) {
    throw new LlmError('Analysis not found');
  }

  return {
    analysis_id: analysis.id,
    uniscore: analysis.uniscore,
    breakdown: JSON.parse(analysis.breakdown),
    strengths: JSON.parse(analysis.strengths),
    weaknesses: JSON.parse(analysis.weaknesses),
  };
}
