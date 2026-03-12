/**
 * Scoring Engine – The core UniScore computation engine.
 * FULLY DETERMINISTIC – no LLM involvement in score calculation.
 *
 * UniScore =
 *   (0.30 * keyword_match_score)
 * + (0.25 * market_alignment_score)
 * + (0.15 * section_completeness_score)
 * + (0.15 * readability_score)
 * + (0.15 * experience_depth_score)
 */

import type { ResumeSections, JdExtractedData, ScoreBreakdown } from '../types/index.js';
import { matchKeywords } from './keyword-matcher.js';
import { computeReadabilityScore } from './readability-score.js';
import { computeMarketAlignment } from './role-market-benchmark.js';
import { validateSections } from './section-validator.js';

const WEIGHTS = {
  keyword_match: 0.30,
  market_alignment: 0.25,
  section_completeness: 0.15,
  readability: 0.15,
  experience_depth: 0.15,
} as const;

export interface ScoringResult {
  uniscore: number;
  breakdown: ScoreBreakdown;
  details: {
    keyword_details: {
      matched: string[];
      missing: string[];
      match_percentage: number;
    };
    market_details: {
      matched_benchmarks: string[];
      missing_benchmarks: string[];
      detected_seniority: string;
      seniority_match: boolean;
    };
    section_details: {
      present: string[];
      missing: string[];
      section_scores: Record<string, number>;
    };
    readability_details: {
      avg_sentence_length: number;
      avg_word_length: number;
      passive_voice_ratio: number;
      action_verb_ratio: number;
    };
    experience_details: {
      total_entries: number;
      avg_bullets_per_entry: number;
      quantified_achievements: number;
      depth_score: number;
    };
  };
}

export function computeUniScore(
  resumeText: string,
  sections: ResumeSections,
  jdData: JdExtractedData
): ScoringResult {
  // Step 1: Keyword Match Score
  const keywordResult = matchKeywords(
    resumeText,
    jdData.required_skills,
    jdData.preferred_skills
  );
  const keywordScore = keywordResult.score;

  // Step 2: Market Alignment Score
  const marketResult = computeMarketAlignment(
    resumeText,
    sections.skills,
    sections.experience.length,
    jdData.title,
    jdData.industry,
    jdData.seniority_level
  );
  const marketScore = marketResult.score;

  // Step 3: Section Completeness Score
  const sectionResult = validateSections(sections);
  const sectionScore = sectionResult.score;

  // Step 4: Readability Score
  const readabilityResult = computeReadabilityScore(resumeText);
  const readabilityScore = readabilityResult.score;

  // Step 5: Experience Depth Score
  const experienceDepthResult = computeExperienceDepth(sections, jdData);
  const experienceDepthScore = experienceDepthResult.depth_score;

  // Step 6: Compute weighted final score
  const rawScore =
    WEIGHTS.keyword_match * keywordScore +
    WEIGHTS.market_alignment * marketScore +
    WEIGHTS.section_completeness * sectionScore +
    WEIGHTS.readability * readabilityScore +
    WEIGHTS.experience_depth * experienceDepthScore;

  const uniscore = clamp(Math.round(rawScore), 0, 100);

  return {
    uniscore,
    breakdown: {
      keyword_match: keywordScore,
      market_alignment: marketScore,
      section_completeness: sectionScore,
      readability: readabilityScore,
      experience_depth: experienceDepthScore,
    },
    details: {
      keyword_details: {
        matched: keywordResult.matched_keywords,
        missing: keywordResult.missing_keywords,
        match_percentage: keywordResult.match_percentage,
      },
      market_details: {
        matched_benchmarks: marketResult.matched_benchmarks,
        missing_benchmarks: marketResult.missing_benchmarks,
        detected_seniority: marketResult.detected_seniority,
        seniority_match: marketResult.seniority_match,
      },
      section_details: {
        present: sectionResult.present_sections,
        missing: sectionResult.missing_sections,
        section_scores: sectionResult.section_scores,
      },
      readability_details: {
        avg_sentence_length: readabilityResult.avg_sentence_length,
        avg_word_length: readabilityResult.avg_word_length,
        passive_voice_ratio: readabilityResult.passive_voice_ratio,
        action_verb_ratio: readabilityResult.action_verb_ratio,
      },
      experience_details: experienceDepthResult,
    },
  };
}

interface ExperienceDepthResult {
  total_entries: number;
  avg_bullets_per_entry: number;
  quantified_achievements: number;
  depth_score: number;
}

function computeExperienceDepth(sections: ResumeSections, jdData: JdExtractedData): ExperienceDepthResult {
  const experience = sections.experience;

  if (experience.length === 0) {
    return {
      total_entries: 0,
      avg_bullets_per_entry: 0,
      quantified_achievements: 0,
      depth_score: 10,
    };
  }

  const totalBullets = experience.reduce((sum, e) => sum + e.bullets.length, 0);
  const avgBullets = totalBullets / experience.length;

  // Count quantified achievements
  let quantified = 0;
  for (const exp of experience) {
    for (const bullet of exp.bullets) {
      if (/\d+%|\$[\d,]+|\d+x|\d+\+|\d+\s*(users|customers|clients|projects|teams|people)/.test(bullet)) {
        quantified++;
      }
    }
  }

  // Relevance: check how many experience entries mention JD keywords
  const jdKeywords = [...jdData.required_skills, ...jdData.preferred_skills].map(s => s.toLowerCase());
  let relevantEntries = 0;
  for (const exp of experience) {
    const expText = [exp.title, exp.company, ...exp.bullets].join(' ').toLowerCase();
    const hasRelevance = jdKeywords.some(k => expText.includes(k));
    if (hasRelevance) relevantEntries++;
  }

  const relevanceRatio = experience.length > 0 ? relevantEntries / experience.length : 0;

  // Compute depth score components
  let score = 0;

  // Entry count (having 2-5 entries is ideal)
  if (experience.length >= 2 && experience.length <= 5) score += 25;
  else if (experience.length === 1) score += 15;
  else if (experience.length > 5) score += 20;

  // Average bullets per entry (3-6 ideal)
  if (avgBullets >= 3 && avgBullets <= 6) score += 25;
  else if (avgBullets >= 1 && avgBullets < 3) score += 15;
  else if (avgBullets > 6) score += 20;
  else score += 5;

  // Quantified achievements (having some is good)
  const quantifiedRatio = totalBullets > 0 ? quantified / totalBullets : 0;
  if (quantifiedRatio >= 0.3) score += 25;
  else if (quantifiedRatio >= 0.15) score += 18;
  else if (quantifiedRatio > 0) score += 10;
  else score += 3;

  // Relevance to JD
  score += Math.round(relevanceRatio * 25);

  return {
    total_entries: experience.length,
    avg_bullets_per_entry: Math.round(avgBullets * 10) / 10,
    quantified_achievements: quantified,
    depth_score: clamp(score, 0, 100),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
