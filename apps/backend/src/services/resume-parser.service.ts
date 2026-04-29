/**
 * Resume Parser Service – Handles PDF/DOCX text extraction and
 * LLM-based section parsing.
 */

import { query, queryOne, execute } from './db.service.js';
import { callLlm, getLlmConfig } from './llm.service.js';
import { buildResumeParsePrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateResumeSections } from '../utils/response-validator.js';
import { checkForInjection } from '../utils/injection-guard.js';
import { resumeSectionsSchema } from '../utils/vertex-response-schemas.js';
import { computeReadabilityScore } from '../utils/readability-score.js';
import { validateSections } from '../utils/section-validator.js';
import { uploadResumeToSupabase, deleteResumeFromSupabase } from './supabase.service.js';
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
 * DOCX is a ZIP archive containing word/document.xml (DEFLATE-compressed).
 * We parse the ZIP local-file headers, decompress the XML entry with the
 * Web Streams DecompressionStream API (available in Cloudflare Workers),
 * and extract text from <w:t> nodes respecting paragraph boundaries.
 */
export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const LOCAL_HEADER_SIG = 0x04034b50; // PK\x03\x04

  let offset = 0;
  while (offset + 30 <= bytes.length) {
    if (dv.getUint32(offset, true) !== LOCAL_HEADER_SIG) {
      break; // reached central directory or end-of-central-directory record
    }

    const compressionMethod = dv.getUint16(offset + 8, true);
    const compressedSize    = dv.getUint32(offset + 18, true);
    const fileNameLength    = dv.getUint16(offset + 26, true);
    const extraFieldLength  = dv.getUint16(offset + 28, true);

    const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLength);
    const fileName      = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(fileNameBytes);
    const dataOffset    = offset + 30 + fileNameLength + extraFieldLength;

    if (fileName === 'word/document.xml') {
      const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize);
      try {
        let xmlText: string;

        if (compressionMethod === 0) {
          // Stored – not compressed
          xmlText = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(compressedData);
        } else if (compressionMethod === 8) {
          // Deflate – ZIP uses raw DEFLATE (no zlib header/trailer)
          const ds     = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          await writer.write(compressedData);
          await writer.close();

          const reader = ds.readable.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }

          const total  = chunks.reduce((n, c) => n + c.length, 0);
          const merged = new Uint8Array(total);
          let pos = 0;
          for (const chunk of chunks) { merged.set(chunk, pos); pos += chunk.length; }
          xmlText = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(merged);
        } else {
          break; // unsupported compression method
        }

        // Collect text per paragraph for natural line breaks
        const paragraphs: string[] = [];
        for (const para of (xmlText.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [])) {
          const parts: string[] = [];
          for (const m of para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)) {
            if (m[1].length > 0) parts.push(m[1]);
          }
          if (parts.length > 0) paragraphs.push(parts.join(''));
        }
        if (paragraphs.length > 0) return paragraphs.join('\n').trim();

        // Fallback: join all text tokens without paragraph structure
        return (xmlText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [])
          .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
          .filter(t => t.length > 0)
          .join(' ')
          .trim();
      } catch (e) {
        console.error('DOCX decompression/parse failed:', e);
        break;
      }
    }

    // Advance to the next local-file entry
    if (compressedSize === 0) {
      // Data-descriptor mode: scan forward for the next local header signature
      let scan = dataOffset + 4;
      while (scan + 4 <= bytes.length) {
        if (dv.getUint32(scan, true) === LOCAL_HEADER_SIG) { offset = scan; break; }
        scan++;
      }
      if (dv.getUint32(offset, true) !== LOCAL_HEADER_SIG) break;
    } else {
      offset = dataOffset + compressedSize;
    }
  }

  // Last-resort byte scan for printable ASCII strings (e.g. malformed ZIP)
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      cur += String.fromCharCode(b);
    } else {
      if (cur.length > 4) parts.push(cur);
      cur = '';
    }
  }
  if (cur.length > 4) parts.push(cur);

  return parts
    .filter(p => !/^[\d\s.]+$/.test(p) && !p.startsWith('PK') && !p.startsWith('<?xml'))
    .join('\n')
    .trim();
}

/**
 * Clean raw extracted text before sending to LLM.
 * Removes excessive whitespace, lone page numbers, repeated chars.
 */
function cleanResumeText(raw: string): string {
  return raw
    .replace(/[ \t]{3,}/g, '  ')          // collapse 3+ spaces/tabs → 2 spaces
    .replace(/\n{3,}/g, '\n\n')             // max 2 consecutive newlines
    .replace(/^\s*\d{1,3}\s*$/gm, '')       // remove lone page numbers
    .replace(/(.)\1{5,}/g, '$1$1')          // collapse 6+ repeated chars → 2
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip non-printable control chars
    .trim();
}

/**
 * Parse extracted text into structured resume sections using LLM.
 */
export async function parseResumeSections(rawText: string, config: import('../types/index.js').LlmConfig, fileBuffer?: ArrayBuffer, extension?: string): Promise<ResumeSections> {
  if ((!rawText || rawText.trim().length < 20) && !fileBuffer) {
    throw new ValidationError('Could not extract text and no file provided for OCR. Please upload a valid resume.');
  }

  const injectionCheck = checkForInjection(rawText);

  const textToProcess = injectionCheck.is_safe ? rawText : injectionCheck.sanitized_text;

  // Gemini supports application/pdf as inline multimodal data; DOCX is not natively supported.
  let file_data: { mime_type: string; data: string } | undefined = undefined;
  if (fileBuffer && extension === 'pdf') {
    try {
      const uint8Array = new Uint8Array(fileBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      file_data = { mime_type: 'application/pdf', data: btoa(binary) };
    } catch (e) {
      console.error('Failed to encode PDF for multimodal LLM processing:', e);
    }
  }

  // When PDF text extraction yielded little content, tell Gemini to use the attached file.
  const usePdfFile = extension === 'pdf' && !!fileBuffer && textToProcess.trim().length < 100;
  const prompt = buildResumeParsePrompt(textToProcess, usePdfFile);

  const llmResponse = await callLlm(config, {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.1,
    max_tokens: 4096,
    response_schema: resumeSectionsSchema,
    file_data,
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
 * Upload and process a resume: upload to Supabase Storage, extract text,
 * parse sections via LLM, and store metadata + file_url in Neon DB.
 */
export async function uploadAndParseResume(
  fileBuffer: ArrayBuffer,
  fileName: string,
  userId: string,
  env: Env
): Promise<{ id: string; file_url: string | null; sections: ResumeSections; raw_text: string }> {
  const extension = fileName.toLowerCase().split('.').pop();

  // ── 1. Upload raw file to Supabase Storage ──────────────────────
  let fileUrl: string | null = null;
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new ValidationError('Supabase credentials missing. Resume uploads require backend configuration.');
  }
  
  fileUrl = await uploadResumeToSupabase(
    { supabaseUrl: env.SUPABASE_URL, supabaseSecretKey: env.SUPABASE_SECRET_KEY },
    fileBuffer,
    fileName,
    userId,
  );

  // ── 2. Extract text ─────────────────────────────────────────────
  let rawText: string;
  if (extension === 'pdf') {
    rawText = extractTextFromPdf(fileBuffer);
  } else if (extension === 'docx' || extension === 'doc') {
    rawText = await extractTextFromDocx(fileBuffer);
  } else {
    throw new ValidationError('Unsupported file format. Please upload a PDF or DOCX file.');
  }

  rawText = cleanResumeText(rawText);

  if (rawText.trim().length < 20) {
    console.log('Very little text extracted, relying mostly on Vertex AI multimodal extraction.');
  }

  // ── 3. Parse sections via LLM ────────────────────────────────────
  const sections = await parseResumeSections(rawText, getLlmConfig(env), fileBuffer, extension);

  if (isEmptySections(sections) && rawText.trim().length === 0) {
    throw new ValidationError('There is nothing in the uploaded document.');
  }

  const missingRequired = getMissingRequiredSections(sections);
  if (missingRequired.length > 0) {
    throw new ValidationError(`Uploaded document is not a resume. Missing required sections: ${missingRequired.join(', ')}.`);
  }

  // ── 4. Store in Neon ─────────────────────────────────────────────
  const defaultCandidateName = fileName.replace(/\.[^/.]+$/, "");
  const resume = await queryOne<ResumeRow>(
    env.DATABASE_URL,
    `INSERT INTO resumes (id, user_id, original_filename, candidate_name, file_url, raw_text, sections)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, fileName, defaultCandidateName, fileUrl, rawText, JSON.stringify(sections)]
  );

  if (!resume) {
    throw new Error('Failed to save resume');
  }

  return {
    id: resume.id,
    file_url: resume.file_url ?? null,
    sections,
    raw_text: rawText,
  };
}

function isEmptySections(sections: ResumeSections): boolean {
  return !sections.summary
    && (sections.experience || []).length === 0
    && (sections.education || []).length === 0
    && (sections.skills || []).length === 0
    && (sections.certifications || []).length === 0
    && (sections.projects || []).length === 0
    && (sections.other || []).length === 0;
}

function getMissingRequiredSections(sections: ResumeSections): string[] {
  const missing: string[] = [];
  const hasEducation = (sections.education || []).some((edu) =>
    [edu.degree, edu.institution, edu.year, edu.details].some((v) => v && v.trim().length > 0)
  );
  const hasSkills = (sections.skills || []).some((skill) => skill.trim().length > 0);
  const hasProjects = (sections.projects || []).some((proj) =>
    [proj.name, proj.description].some((v) => v && v.trim().length > 0)
    || (proj.technologies || []).length > 0
  );

  if (!hasEducation) missing.push('Education');
  if (!hasSkills) missing.push('Skills');
  if (!hasProjects) missing.push('Projects');

  return missing;
}

/**
 * Get a parsed resume by ID, with ownership check.
 */
export async function getResumeById(
  resumeId: string,
  userId: string,
  databaseUrl: string
): Promise<{ id: string; raw_text: string; sections: ResumeSections; original_filename: string; candidate_name?: string; file_url: string | null; created_at: string }> {
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
    sections: (typeof resume.sections === 'string' ? JSON.parse(resume.sections) : resume.sections) as ResumeSections,
    original_filename: resume.original_filename,
    candidate_name: (resume as any).candidate_name,
    file_url: resume.file_url ?? null,
    created_at: resume.created_at,
  };
}

/**
 * Delete a resume by ID with ownership check.
 * Also deletes the file from Supabase Storage if a URL is present.
 */
export async function deleteResume(
  resumeId: string,
  userId: string,
  databaseUrl: string,
  supabaseConfig?: { supabaseUrl: string; supabaseSecretKey: string }
): Promise<void> {
  const resume = await queryOne<{ id: string; file_url: string | null }>(
    databaseUrl,
    `SELECT id, file_url FROM resumes WHERE id = $1 AND user_id = $2`,
    [resumeId, userId]
  );

  if (!resume) {
    throw new NotFoundError('Resume');
  }

  // Remove from Supabase Storage if we have a URL and config
  if (resume.file_url && supabaseConfig) {
    await deleteResumeFromSupabase(supabaseConfig, resume.file_url).catch(console.error);
  }

  // Delete versions first – no FK constraint on versions.resume_id
  await execute(
    databaseUrl,
    `DELETE FROM versions WHERE resume_id = $1 AND user_id = $2`,
    [resumeId, userId]
  );

  // Delete resume – DB cascades to analyses, enhanced_resumes, cover_letters
  await execute(
    databaseUrl,
    `DELETE FROM resumes WHERE id = $1 AND user_id = $2`,
    [resumeId, userId]
  );
}

/**
 * List all resumes for a given user.
 */
export async function listResumes(
  userId: string,
  databaseUrl: string
): Promise<{ id: string; original_filename: string; candidate_name?: string; file_url: string | null; created_at: string; updated_at: string }[]> {
  const rows = await query<ResumeRow>(
    databaseUrl,
    `SELECT id, original_filename, candidate_name, file_url, created_at, updated_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    original_filename: r.original_filename,
    candidate_name: (r as any).candidate_name,
    file_url: r.file_url ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at ?? r.created_at,
  }));
}

/**
 * Standalone ATS score for a resume (no JD required).
 * Uses section completeness, readability, and experience depth.
 */
export async function scoreResumeStandalone(
  resumeId: string,
  userId: string,
  databaseUrl: string
): Promise<{
  resume_id: string;
  ats_score: number;
  breakdown: { section_completeness: number; readability: number; experience_depth: number };
  feedback: string[];
}> {
  const resume = await getResumeById(resumeId, userId, databaseUrl);
  const sections = resume.sections;

  // Section Completeness
  const sectionResult = validateSections(sections);
  const sectionScore = sectionResult.score;

  // Readability
  const readabilityResult = computeReadabilityScore(resume.raw_text);
  const readabilityScore = readabilityResult.score;

  // Experience Depth (simplified without JD)
  const experience = sections.experience || [];
  let experienceScore = 10;
  if (experience.length > 0) {
    const totalBullets = experience.reduce((sum, e) => sum + (e.bullets?.length || 0), 0);
    const avgBullets = totalBullets / experience.length;
    let score = 0;
    if (experience.length >= 2 && experience.length <= 5) score += 30;
    else if (experience.length === 1) score += 20;
    else if (experience.length > 5) score += 25;
    if (avgBullets >= 3 && avgBullets <= 6) score += 35;
    else if (avgBullets >= 1 && avgBullets < 3) score += 20;
    else if (avgBullets > 6) score += 25;
    else score += 5;
    let quantified = 0;
    for (const exp of experience) {
      for (const bullet of (exp.bullets || [])) {
        if (/\d+%|\$[\d,]+|\d+x|\d+\+|\d+\s*(users|customers|clients|projects|teams|people)/.test(bullet)) {
          quantified++;
        }
      }
    }
    const quantifiedRatio = totalBullets > 0 ? quantified / totalBullets : 0;
    if (quantifiedRatio >= 0.3) score += 35;
    else if (quantifiedRatio >= 0.15) score += 25;
    else if (quantifiedRatio > 0) score += 15;
    else score += 5;
    experienceScore = Math.min(100, Math.max(0, score));
  }

  const atsScore = Math.round(
    0.40 * sectionScore +
    0.30 * readabilityScore +
    0.30 * experienceScore
  );

  // Generate feedback
  const feedback: string[] = [];
  if (!sections.summary) feedback.push('Add a professional summary to improve ATS readability.');
  if ((sections.skills || []).length < 5) feedback.push('Expand your skills section — aim for at least 5-8 relevant skills.');
  if (experience.length === 0) feedback.push('Add work experience entries to significantly improve your score.');
  if (sectionScore < 60) feedback.push('Your resume is missing key sections (education, projects, certifications).');
  if (readabilityScore < 60) feedback.push('Improve readability: use action verbs, shorter sentences, and active voice.');
  if (experienceScore >= 70) feedback.push('Great experience section with good depth and detail.');
  if (sectionScore >= 80) feedback.push('Excellent section coverage — all key resume parts are present.');
  if (readabilityScore >= 70) feedback.push('Good writing quality with clear, professional language.');

  return {
    resume_id: resumeId,
    ats_score: Math.min(100, Math.max(0, atsScore)),
    breakdown: {
      section_completeness: sectionScore,
      readability: readabilityScore,
      experience_depth: experienceScore,
    },
    feedback,
  };
}
