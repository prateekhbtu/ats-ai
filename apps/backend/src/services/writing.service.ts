/**
 * Writing Service – Text analysis for writing quality.
 * Combines deterministic detection with LLM suggestions.
 */

import { callLlm } from './llm.service.js';
import type { LlmConfig } from '../types/index.js';
import { buildWritingAnalysisPrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateWritingAnalysis } from '../utils/response-validator.js';
import { checkForInjection, enforceTextBoundary } from '../utils/injection-guard.js';
import { writingAnalysisSchema } from '../utils/vertex-response-schemas.js';
import type { WritingIssue, WritingAnalysisResult } from '../types/index.js';
import { ValidationError } from '../middleware/error-handler.middleware.js';

// ─── Deterministic Detection ──────────────────────────────────────

const PASSIVE_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bwas\s+\w+ed\b/gi, message: 'Consider using active voice instead of passive construction' },
  { pattern: /\bwere\s+\w+ed\b/gi, message: 'Consider using active voice instead of passive construction' },
  { pattern: /\bis\s+being\s+\w+ed\b/gi, message: 'Consider using active voice' },
  { pattern: /\bhas\s+been\s+\w+ed\b/gi, message: 'Consider using active voice' },
  { pattern: /\bresponsible\s+for\b/gi, message: 'Replace "responsible for" with a strong action verb' },
  { pattern: /\btasked\s+with\b/gi, message: 'Replace "tasked with" with a strong action verb' },
  { pattern: /\bassigned\s+to\b/gi, message: 'Replace "assigned to" with a direct action statement' },
];

const WEAK_PHRASES: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /\bhelped\s+with\b/gi, suggestion: 'Use a more specific verb like "facilitated", "enabled", or "supported"' },
  { pattern: /\bworked\s+on\b/gi, suggestion: 'Use a more specific verb like "developed", "implemented", or "designed"' },
  { pattern: /\bvarious\b/gi, suggestion: 'Be specific instead of using "various"' },
  { pattern: /\bmany\b/gi, suggestion: 'Quantify with a specific number instead of "many"' },
  { pattern: /\bsome\b/gi, suggestion: 'Be specific instead of using "some"' },
  { pattern: /\btried\s+to\b/gi, suggestion: 'Remove "tried to" – state the action directly' },
  { pattern: /\bmanaged\s+to\b/gi, suggestion: 'Remove "managed to" – state the accomplishment directly' },
  { pattern: /\bhad\s+to\b/gi, suggestion: 'Remove "had to" – state the action directly' },
  { pattern: /\bin\s+order\s+to\b/gi, suggestion: 'Simplify "in order to" to just "to"' },
  { pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi, suggestion: 'Simplify to "because"' },
  { pattern: /\bat\s+this\s+point\s+in\s+time\b/gi, suggestion: 'Simplify to "now" or "currently"' },
  { pattern: /\bi\s+feel\s+that\b/gi, suggestion: 'Remove "I feel that" – state the fact directly' },
  { pattern: /\bi\s+think\s+that\b/gi, suggestion: 'Remove "I think that" – state it confidently' },
  { pattern: /\bbasically\b/gi, suggestion: 'Remove "basically" – it weakens your statement' },
  { pattern: /\bjust\b/gi, suggestion: 'Consider removing "just" – it minimizes your contribution' },
  { pattern: /\bstuff\b/gi, suggestion: 'Replace "stuff" with specific items' },
  { pattern: /\bthings\b/gi, suggestion: 'Replace "things" with specific items' },
  { pattern: /\betc\.?\b/gi, suggestion: 'List specific items instead of using "etc."' },
];

function detectDeterministicIssues(text: string): WritingIssue[] {
  const issues: WritingIssue[] = [];

  // Detect passive voice
  for (const { pattern, message } of PASSIVE_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: 'passive_voice',
        text: match[0],
        suggestion: message,
        position: { start: match.index, end: match.index + match[0].length },
        severity: 'medium',
      });
    }
  }

  // Detect weak phrasing
  for (const { pattern, suggestion } of WEAK_PHRASES) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: 'weak_phrasing',
        text: match[0],
        suggestion,
        position: { start: match.index, end: match.index + match[0].length },
        severity: 'medium',
      });
    }
  }

  // Detect long sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let charOffset = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const words = trimmed.split(/\s+/);
    const sentenceStart = text.indexOf(trimmed, charOffset);

    if (words.length > 35) {
      issues.push({
        type: 'long_sentence',
        text: trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : ''),
        suggestion: `This sentence has ${words.length} words. Consider breaking it into shorter sentences (15-25 words ideal).`,
        position: {
          start: sentenceStart >= 0 ? sentenceStart : charOffset,
          end: sentenceStart >= 0 ? sentenceStart + trimmed.length : charOffset + trimmed.length,
        },
        severity: 'high',
      });
    } else if (words.length > 25) {
      issues.push({
        type: 'long_sentence',
        text: trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : ''),
        suggestion: `This sentence has ${words.length} words. Consider shortening for better readability.`,
        position: {
          start: sentenceStart >= 0 ? sentenceStart : charOffset,
          end: sentenceStart >= 0 ? sentenceStart + trimmed.length : charOffset + trimmed.length,
        },
        severity: 'low',
      });
    }

    charOffset = (sentenceStart >= 0 ? sentenceStart : charOffset) + trimmed.length;
  }

  return issues;
}

/**
 * Analyze text for writing quality issues.
 * Combines deterministic detection with LLM-powered suggestions.
 */
export async function analyzeWriting(text: string, config: LlmConfig): Promise<WritingAnalysisResult> {
  if (!text || text.trim().length < 20) {
    throw new ValidationError('Text must be at least 20 characters for analysis');
  }

  const sanitized = enforceTextBoundary(text, 15000);
  const injectionCheck = checkForInjection(sanitized);
  const textToAnalyze = injectionCheck.is_safe ? sanitized : injectionCheck.sanitized_text;

  // Step 1: Deterministic analysis
  const deterministicIssues = detectDeterministicIssues(textToAnalyze);

  // Step 2: LLM-enhanced analysis for additional suggestions
  let additionalIssues: WritingIssue[] = [];
  let llmSummary = '';

  try {
    const simplifiedDeterministic = deterministicIssues.map(i => ({
      type: i.type,
      text: i.text,
      position: i.position,
    }));

    const prompt = buildWritingAnalysisPrompt(textToAnalyze, simplifiedDeterministic);

    const llmResponse = await callLlm(config, {
      prompt: prompt.user,
      system_instruction: prompt.system,
      temperature: 0.3,
      max_tokens: 4096,
      response_schema: writingAnalysisSchema,
    });

    const parsed = validateJsonResponse<{
      additional_issues: Array<{
        type: string;
        text: string;
        suggestion: string;
        position: { start: number; end: number };
        severity: string;
      }>;
      summary: string;
    }>(llmResponse.text);

    if (parsed.success && parsed.data && validateWritingAnalysis(parsed.data)) {
      additionalIssues = parsed.data.additional_issues.map(issue => ({
        type: issue.type as WritingIssue['type'],
        text: issue.text,
        suggestion: issue.suggestion,
        position: issue.position,
        severity: issue.severity as WritingIssue['severity'],
      }));
      llmSummary = parsed.data.summary;
    }
  } catch (err) {
    console.error('LLM writing analysis failed, using deterministic results only:', err);
  }

  // Combine all issues
  const allIssues = [...deterministicIssues, ...additionalIssues];

  // Calculate overall writing score
  const overallScore = calculateWritingScore(allIssues, textToAnalyze);

  // Generate summary if LLM didn't provide one
  const summary = llmSummary || generateDeterministicSummary(allIssues, overallScore);

  return {
    issues: allIssues,
    overall_score: overallScore,
    summary,
  };
}

function calculateWritingScore(issues: WritingIssue[], text: string): number {
  const wordCount = text.split(/\s+/).length;
  const baseScore = 100;

  let penalty = 0;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        penalty += 8;
        break;
      case 'medium':
        penalty += 4;
        break;
      case 'low':
        penalty += 2;
        break;
    }
  }

  // Scale penalty by text length (longer texts get proportionally smaller penalties)
  const scaledPenalty = penalty * Math.min(1, 200 / wordCount);

  return Math.max(0, Math.min(100, Math.round(baseScore - scaledPenalty)));
}

function generateDeterministicSummary(issues: WritingIssue[], score: number): string {
  const counts: Record<string, number> = {};
  for (const issue of issues) {
    counts[issue.type] = (counts[issue.type] || 0) + 1;
  }

  const parts: string[] = [];

  if (score >= 80) {
    parts.push('Overall writing quality is good.');
  } else if (score >= 60) {
    parts.push('Writing quality is acceptable but has room for improvement.');
  } else {
    parts.push('Writing quality needs significant improvement.');
  }

  if (counts['passive_voice'] > 0) {
    parts.push(`Found ${counts['passive_voice']} passive voice instance(s) – use active voice for stronger impact.`);
  }
  if (counts['weak_phrasing'] > 0) {
    parts.push(`Found ${counts['weak_phrasing']} weak phrasing instance(s) – use more specific, impactful language.`);
  }
  if (counts['long_sentence'] > 0) {
    parts.push(`Found ${counts['long_sentence']} overly long sentence(s) – break these into shorter, clearer statements.`);
  }

  return parts.join(' ');
}
