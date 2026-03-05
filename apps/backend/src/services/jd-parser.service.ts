/**
 * JD Parser Service – Processes job descriptions from text or URL.
 * Extracts structured data for ATS analysis.
 */

import { queryOne } from './db.service.js';
import { callLlm } from './llm.service.js';
import { buildJdParsePrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateJdExtractedData } from '../utils/response-validator.js';
import { checkForInjection, enforceTextBoundary, sanitizeText } from '../utils/injection-guard.js';
import type { JdRow, JdExtractedData, Env } from '../types/index.js';
import { ValidationError, NotFoundError, LlmError } from '../middleware/error-handler.middleware.js';

/**
 * Fetch job description from a URL (e.g., LinkedIn).
 */
async function fetchJdFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ATSBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new ValidationError(`Failed to fetch job description from URL (status ${response.status})`);
    }

    const html = await response.text();
    return cleanHtml(html);
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('Failed to fetch job description from the provided URL');
  }
}

/**
 * Clean HTML and extract readable text.
 */
function cleanHtml(html: string): string {
  let text = html;

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Convert common block elements to newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|section|article)[^>]*>/gi, '\n');

  // Convert list items
  text = text.replace(/<li[^>]*>/gi, '\n• ');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#\d+;/g, '');

  // Clean whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');

  return text.trim();
}

/**
 * Extract structured data from JD text using LLM.
 */
async function extractJdData(rawText: string, apiKey: string): Promise<JdExtractedData> {
  if (!rawText || rawText.trim().length < 30) {
    throw new ValidationError('Job description text is too short or empty');
  }

  const sanitized = enforceTextBoundary(rawText, 20000);
  const injectionCheck = checkForInjection(sanitized);
  const textToProcess = injectionCheck.is_safe ? sanitized : injectionCheck.sanitized_text;

  const prompt = buildJdParsePrompt(textToProcess);

  const llmResponse = await callLlm(apiKey, {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.1,
    max_tokens: 4096,
  });

  const parsed = validateJsonResponse<JdExtractedData>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to parse JD: ${parsed.error}`);
  }

  if (!validateJdExtractedData(parsed.data)) {
    throw new LlmError('JD parsing returned invalid structure');
  }

  return normalizeJdData(parsed.data);
}

function normalizeJdData(data: JdExtractedData): JdExtractedData {
  return {
    title: (data.title || 'Unknown').trim(),
    company: (data.company || 'Unknown').trim(),
    required_skills: (data.required_skills || []).map(s => s.trim()).filter(s => s.length > 0),
    preferred_skills: (data.preferred_skills || []).map(s => s.trim()).filter(s => s.length > 0),
    experience_requirements: (data.experience_requirements || '').trim(),
    role_expectations: (data.role_expectations || []).map(s => s.trim()).filter(s => s.length > 0),
    industry: (data.industry || 'Unknown').trim(),
    seniority_level: (data.seniority_level || 'Unknown').trim(),
  };
}

/**
 * Process a job description: fetch from URL or clean text, extract data, store in DB.
 */
export async function processJobDescription(
  input: { text?: string; url?: string },
  userId: string,
  env: Env
): Promise<{ id: string; extracted_data: JdExtractedData }> {
  if (!input.text && !input.url) {
    throw new ValidationError('Either job description text or URL is required');
  }

  let rawText: string;
  let sourceUrl: string | null = null;

  if (input.url) {
    sourceUrl = input.url;
    rawText = await fetchJdFromUrl(input.url);
  } else {
    rawText = sanitizeText(input.text!);
  }

  const extractedData = await extractJdData(rawText, env.GEMINI_API_KEY);

  const jd = await queryOne<JdRow>(
    env.DATABASE_URL,
    `INSERT INTO job_descriptions (id, user_id, raw_text, extracted_data, source_url)
     VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
    [userId, rawText, JSON.stringify(extractedData), sourceUrl]
  );

  if (!jd) {
    throw new Error('Failed to save job description');
  }

  return {
    id: jd.id,
    extracted_data: extractedData,
  };
}

/**
 * Get a JD by ID with ownership check.
 */
export async function getJdById(
  jdId: string,
  userId: string,
  databaseUrl: string
): Promise<{ id: string; raw_text: string; extracted_data: JdExtractedData; source_url: string | null }> {
  const jd = await queryOne<JdRow>(
    databaseUrl,
    `SELECT * FROM job_descriptions WHERE id = $1 AND user_id = $2`,
    [jdId, userId]
  );

  if (!jd) {
    throw new NotFoundError('Job description');
  }

  return {
    id: jd.id,
    raw_text: jd.raw_text,
    extracted_data: JSON.parse(jd.extracted_data) as JdExtractedData,
    source_url: jd.source_url,
  };
}
