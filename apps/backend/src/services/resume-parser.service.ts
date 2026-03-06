/**
 * Resume Parser Service – Handles PDF/DOCX text extraction and
 * LLM-based section parsing.
 */

import { queryOne } from './db.service.js';
import { callLlm, getLlmConfig } from './llm.service.js';
import { buildResumeParsePrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateResumeSections } from '../utils/response-validator.js';
import { checkForInjection, enforceTextBoundary } from '../utils/injection-guard.js';
import type { ResumeRow, ResumeSections, Env } from '../types/index.js';
import { ValidationError, NotFoundError, LlmError } from '../middleware/error-handler.middleware.js';

/**
 * Extract raw text from a PDF file (binary ArrayBuffer).
 * Basic text extraction without external libraries – works on CF Workers.
 */
export function extractTextFromPdf(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(bytes);

  // Extract text between stream/endstream markers and try to decode
  const textParts: string[] = [];

  // Method 1: Extract readable ASCII strings
  let currentString = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte >= 32 && byte <= 126) {
      currentString += String.fromCharCode(byte);
    } else if (byte === 10 || byte === 13) {
      if (currentString.length > 3) {
        textParts.push(currentString);
      }
      currentString = '';
    } else {
      if (currentString.length > 3) {
        textParts.push(currentString);
      }
      currentString = '';
    }
  }
  if (currentString.length > 3) {
    textParts.push(currentString);
  }

  // Method 2: Extract text from PDF text operators (Tj, TJ, ')
  const tjMatches = text.match(/\(([^)]+)\)\s*Tj/g) || [];
  for (const match of tjMatches) {
    const content = match.replace(/\(|\)\s*Tj/g, '');
    if (content.length > 1) textParts.push(content);
  }

  // Method 3: Extract BT...ET blocks
  const btMatches = text.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btMatches) {
    const innerText = block.match(/\(([^)]+)\)/g) || [];
    for (const t of innerText) {
      const cleaned = t.replace(/[()]/g, '');
      if (cleaned.length > 1) textParts.push(cleaned);
    }
  }

  // Deduplicate and clean
  const seen = new Set<string>();
  const cleanedParts: string[] = [];
  for (const part of textParts) {
    const trimmed = part.trim();
    // Filter out PDF structure/metadata
    if (trimmed.length < 4) continue;
    if (trimmed.startsWith('/') || trimmed.startsWith('%PDF') || trimmed.startsWith('<<')) continue;
    if (/^[\d\s.]+$/.test(trimmed)) continue;
    if (trimmed.includes('endobj') || trimmed.includes('endstream') || trimmed.includes('xref')) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    cleanedParts.push(trimmed);
  }

  return cleanedParts.join('\n').trim();
}

/**
 * Extract raw text from a DOCX file (binary ArrayBuffer).
 * DOCX = ZIP(xml). Extract text from word/document.xml.
 */
export function extractTextFromDocx(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(bytes);

  // Find XML content with <w:t> tags
  const textParts: string[] = [];
  
  // Extract text from <w:t> and <w:t xml:space="preserve"> tags
  const wtMatches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  for (const match of wtMatches) {
    const content = match.replace(/<w:t[^>]*>|<\/w:t>/g, '');
    if (content.length > 0) textParts.push(content);
  }

  // If no XML tags found, try plain text extraction
  if (textParts.length === 0) {
    let currentString = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte >= 32 && byte <= 126) {
        currentString += String.fromCharCode(byte);
      } else if (byte === 10 || byte === 13) {
        if (currentString.length > 3) {
          textParts.push(currentString);
        }
        currentString = '';
      } else {
        if (currentString.length > 3) {
          textParts.push(currentString);
        }
        currentString = '';
      }
    }
    if (currentString.length > 3) {
      textParts.push(currentString);
    }
  }

  // Build paragraphs from w:p boundaries
  const joined = textParts.join(' ');
  
  // Clean up extra whitespace
  return joined.replace(/\s+/g, ' ').trim();
}

/**
 * Parse extracted text into structured resume sections using LLM.
 */
export async function parseResumeSections(rawText: string, config: import('../types/index.js').LlmConfig): Promise<ResumeSections> {
  if (!rawText || rawText.trim().length < 50) {
    throw new ValidationError('Resume text is too short or empty. Please upload a valid resume file.');
  }

  const sanitized = enforceTextBoundary(rawText, 30000);
  const injectionCheck = checkForInjection(sanitized);
  
  const textToProcess = injectionCheck.is_safe ? sanitized : injectionCheck.sanitized_text;

  const prompt = buildResumeParsePrompt(textToProcess);

  const llmResponse = await callLlm(config, {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.1,
    max_tokens: 4096,
  });

  const parsed = validateJsonResponse<ResumeSections>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to parse resume sections: ${parsed.error}`);
  }

  if (!validateResumeSections(parsed.data)) {
    throw new LlmError('Resume parsing returned invalid structure');
  }

  // Normalize the parsed data
  return normalizeSections(parsed.data);
}

function normalizeSections(sections: ResumeSections): ResumeSections {
  return {
    summary: sections.summary?.trim() || null,
    experience: (sections.experience || []).map(exp => ({
      title: (exp.title || '').trim(),
      company: (exp.company || '').trim(),
      duration: (exp.duration || '').trim(),
      bullets: (exp.bullets || []).map(b => b.trim()).filter(b => b.length > 0),
    })),
    education: (sections.education || []).map(edu => ({
      degree: (edu.degree || '').trim(),
      institution: (edu.institution || '').trim(),
      year: (edu.year || '').trim(),
      details: (edu.details || '').trim(),
    })),
    skills: (sections.skills || []).map(s => s.trim()).filter(s => s.length > 0),
    certifications: (sections.certifications || []).map(c => c.trim()).filter(c => c.length > 0),
    projects: (sections.projects || []).map(p => ({
      name: (p.name || '').trim(),
      description: (p.description || '').trim(),
      technologies: (p.technologies || []).map(t => t.trim()).filter(t => t.length > 0),
    })),
    other: (sections.other || []).map(o => o.trim()).filter(o => o.length > 0),
  };
}

/**
 * Upload and process a resume: extract text, parse sections, store in DB.
 */
export async function uploadAndParseResume(
  fileBuffer: ArrayBuffer,
  fileName: string,
  userId: string,
  env: Env
): Promise<{ id: string; sections: ResumeSections; raw_text: string }> {
  const extension = fileName.toLowerCase().split('.').pop();

  let rawText: string;

  if (extension === 'pdf') {
    rawText = extractTextFromPdf(fileBuffer);
  } else if (extension === 'docx' || extension === 'doc') {
    rawText = extractTextFromDocx(fileBuffer);
  } else {
    throw new ValidationError('Unsupported file format. Please upload a PDF or DOCX file.');
  }

  if (rawText.trim().length < 50) {
    throw new ValidationError('Could not extract sufficient text from the uploaded file. Please ensure the file contains readable text.');
  }

  const sections = await parseResumeSections(rawText, getLlmConfig(env));

  const resume = await queryOne<ResumeRow>(
    env.DATABASE_URL,
    `INSERT INTO resumes (id, user_id, original_filename, raw_text, sections)
     VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
    [userId, fileName, rawText, JSON.stringify(sections)]
  );

  if (!resume) {
    throw new Error('Failed to save resume');
  }

  return {
    id: resume.id,
    sections,
    raw_text: rawText,
  };
}

/**
 * Get a parsed resume by ID, with ownership check.
 */
export async function getResumeById(
  resumeId: string,
  userId: string,
  databaseUrl: string
): Promise<{ id: string; raw_text: string; sections: ResumeSections; original_filename: string; created_at: string }> {
  const resume = await queryOne<ResumeRow>(
    databaseUrl,
    `SELECT * FROM resumes WHERE id = $1 AND user_id = $2`,
    [resumeId, userId]
  );

  if (!resume) {
    throw new NotFoundError('Resume');
  }

  return {
    id: resume.id,
    raw_text: resume.raw_text,
    sections: JSON.parse(resume.sections) as ResumeSections,
    original_filename: resume.original_filename,
    created_at: resume.created_at,
  };
}
