/**
 * Response Validator – Validates and parses LLM JSON responses.
 * Ensures structured outputs match expected schemas.
 */

export interface ValidationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function validateJsonResponse<T>(text: string): ValidationResult<T> {
  const cleaned = extractJson(text);

  if (!cleaned) {
    return { success: false, data: null, error: 'No valid JSON found in LLM response' };
  }

  try {
    const parsed = JSON.parse(cleaned) as T;
    return { success: true, data: parsed, error: null };
  } catch (e) {
    return {
      success: false,
      data: null,
      error: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

function extractJson(text: string): string | null {
  // Try direct parse first
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue with extraction
  }

  // Try to extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      JSON.parse(codeBlockMatch[1].trim());
      return codeBlockMatch[1].trim();
    } catch {
      // Continue
    }
  }

  // Try to find JSON object/array boundaries
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let startIndex: number;
  let endChar: string;

  if (firstBrace === -1 && firstBracket === -1) return null;

  if (firstBrace === -1) {
    startIndex = firstBracket;
    endChar = ']';
  } else if (firstBracket === -1) {
    startIndex = firstBrace;
    endChar = '}';
  } else {
    startIndex = Math.min(firstBrace, firstBracket);
    endChar = startIndex === firstBrace ? '}' : ']';
  }

  // Find matching end
  let depth = 0;
  let endIndex = -1;
  const openChar = text[startIndex];

  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    if (text[i] === endChar) depth--;
    if (depth === 0) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) return null;

  const candidate = text.slice(startIndex, endIndex + 1);
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}

export function validateResumeSections(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  const hasExperience = Array.isArray(obj.experience);
  const hasEducation = Array.isArray(obj.education);
  const hasSkills = Array.isArray(obj.skills);

  return hasExperience && hasEducation && hasSkills;
}

export function validateJdExtractedData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.title === 'string' &&
    Array.isArray(obj.required_skills) &&
    Array.isArray(obj.preferred_skills) &&
    Array.isArray(obj.role_expectations)
  );
}

export function validateStrengthsWeaknesses(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return Array.isArray(obj.strengths) && Array.isArray(obj.weaknesses);
}

export function validateCoverLetterResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return typeof obj.content === 'string' && obj.content.length > 50;
}

export function validateWritingAnalysis(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return Array.isArray(obj.additional_issues) && typeof obj.summary === 'string';
}

export function validateInterviewQuestions(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.questions)) return false;
  return obj.questions.every(
    (q: unknown) =>
      typeof q === 'object' &&
      q !== null &&
      typeof (q as Record<string, unknown>).category === 'string' &&
      typeof (q as Record<string, unknown>).question === 'string'
  );
}
