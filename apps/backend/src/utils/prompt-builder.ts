/**
 * Prompt Builder – Constructs structured prompts for LLM calls
 * with injection protection boundaries and structured output enforcement.
 */

import type { ResumeSections, JdExtractedData, CoverLetterTone } from '../types/index.js';

const GROUNDING_INSTRUCTION = `CRITICAL RULES:
1. You must ONLY use information present in the provided resume. 
2. Do NOT invent, fabricate, or assume any skills, experiences, certifications, companies, or achievements.
3. Do NOT add information that is not explicitly stated in the resume.
4. If the resume lacks relevant content for the job, acknowledge the gap – do NOT fill it with made-up content.
5. All output must be valid JSON matching the specified schema exactly.
6. NEVER hallucinate numbers, dates, company names, titles, or certifications not present in the source text.`;

const JSON_ONLY_INSTRUCTION = `OUTPUT FORMAT: Respond with raw JSON ONLY. NEVER wrap output in markdown code fences (\`\`\`json or \`\`\`). NEVER include any explanation, preamble, or trailing text. Your ENTIRE response must be a single valid JSON object starting with { and ending with }. If you cannot comply, return {"error":"unable to complete"}.`;

export function buildResumeParsePrompt(rawText: string, useAttachedFile = false): { system: string; user: string } {
  const userMessage = useAttachedFile
    ? `You are an advanced resume parsing engine used inside an Applicant Tracking System (ATS).\n\nThe resume PDF is attached above. The raw text below was extracted from a compressed PDF and may be incomplete or corrupted — prefer the attached PDF file over the raw text.\n\nRESUME_TEXT_START\n${rawText}\nRESUME_TEXT_END`
    : `You are an advanced resume parsing engine used inside an Applicant Tracking System (ATS).\n\nExtract all structured resume information from the raw text below.\n\nRESUME_TEXT_START\n${rawText}\nRESUME_TEXT_END`;

  return {
    system: `You are an advanced resume parsing engine used inside an Applicant Tracking System (ATS).

Your job is to extract structured resume information from the provided input.

The input may include:
1. Raw resume text extracted from a PDF or DOCX file
2. A PDF document attached as file input
3. Messy or partially corrupted text due to PDF extraction

Your goal is to extract the best possible structured resume information.

IMPORTANT RULES
1. Use ONLY information present in the resume.
2. NEVER invent or assume information that does not exist.
3. If a field cannot be determined, return null (for summary) or an empty array [].
4. Ignore PDF artifacts such as object markers, encoding characters, page numbers, and layout fragments.
5. Reconstruct sentences if the text is broken due to PDF extraction.
6. Preserve bullet points as individual array items.
7. Normalize whitespace and remove formatting artifacts.
8. If both raw text and a PDF file are provided, prefer the PDF file content.
9. NEVER hallucinate numbers, dates, company names, titles, or certifications not present in the source text.

${JSON_ONLY_INSTRUCTION}

The JSON must follow EXACTLY this schema:
{
  "summary": string | null,
  "experience": [
    { "title": string, "company": string, "duration": string, "bullets": string[] }
  ],
  "education": [
    { "degree": string, "institution": string, "year": string, "details": string }
  ],
  "skills": string[],
  "certifications": string[],
  "projects": [
    { "name": string, "description": string, "technologies": string[] }
  ],
  "other": string[]
}

SECTION EXTRACTION GUIDELINES
- SUMMARY: extract the professional summary or profile statement if present, else null.
- EXPERIENCE: each entry must include job title, company name, duration/dates, and bullet points.
- EDUCATION: extract degree, institution, and graduation year where available.
- SKILLS: extract both technical and professional skills as individual strings.
- CERTIFICATIONS: include professional certifications or licenses.
- PROJECTS: include project name, description, and technologies used.
- OTHER: include awards, volunteer work, publications, languages, interests.

TEXT CLEANING RULES
- Remove duplicated whitespace and merge broken lines.
- Remove layout artifacts and non-human-readable text.
- Ignore lone page numbers or header/footer fragments.

FINAL VALIDATION
Before returning: ensure the JSON is valid, the structure matches the schema exactly, and no hallucinated information is included. If sections are missing, return empty arrays.

REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: userMessage,
  };
}

export function buildJdParsePrompt(rawText: string): { system: string; user: string } {
  return {
    system: `You are a job description analysis assistant. Extract structured information from job descriptions.
${JSON_ONLY_INSTRUCTION}
Return valid JSON with this exact schema:
{
  "title": string,
  "company": string,
  "required_skills": string[],
  "preferred_skills": string[],
  "experience_requirements": string,
  "role_expectations": string[],
  "industry": string,
  "seniority_level": string
}
Extract only information present in the text. Use "unknown" for fields that cannot be determined.
REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: `Analyze the following job description:\n\n---BEGIN JD---\n${rawText}\n---END JD---`,
  };
}

export function buildStrengthsWeaknessesPrompt(
  sections: ResumeSections,
  jdData: JdExtractedData,
  breakdown: { keyword_match: number; market_alignment: number; section_completeness: number; readability: number; experience_depth: number }
): { system: string; user: string } {
  return {
    system: `You are an ATS resume analysis expert. Based on the resume and job description provided, generate specific strengths and weaknesses.
${GROUNDING_INSTRUCTION}
${JSON_ONLY_INSTRUCTION}
Return valid JSON with this exact schema:
{
  "strengths": string[],
  "weaknesses": string[]
}
Each item should be a specific, actionable observation. Provide 3-7 of each.
REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: `Resume sections:
${JSON.stringify(sections, null, 2)}

Job description:
${JSON.stringify(jdData, null, 2)}

Score breakdown:
- Keyword match: ${breakdown.keyword_match}/100
- Market alignment: ${breakdown.market_alignment}/100
- Section completeness: ${breakdown.section_completeness}/100
- Readability: ${breakdown.readability}/100
- Experience depth: ${breakdown.experience_depth}/100

Generate strengths and weaknesses based on this analysis.`,
  };
}

export function buildResumeEnhancePrompt(
  sections: ResumeSections,
  jdData: JdExtractedData,
  weaknesses: string[]
): { system: string; user: string } {
  const preserveEmployers = sections.experience.map(e => e.company).filter(Boolean).join(', ');
  const preserveInstitutions = sections.education.map(e => e.institution).filter(Boolean).join(', ');
  const preserveCerts = sections.certifications.filter(Boolean).join(', ');
  const preserveProjects = sections.projects.map(p => p.name).filter(Boolean).join(', ');

  return {
    system: `You are a professional resume writer specializing in ATS optimization.
${GROUNDING_INSTRUCTION}
${JSON_ONLY_INSTRUCTION}
Your task is to enhance the resume to better match the job description while using ONLY the information already present in the resume.
You may:
- Reword bullets for clarity and impact
- Reorder sections for relevance
- Add relevant keywords from the JD where the experience already exists
- Improve formatting and phrasing
You must NOT:
- Add new skills the candidate doesn't have
- Invent work experience or achievements
- Fabricate metrics or numbers
- Add certifications or education not in the original

PRESERVATION RULES — these exact values must appear unchanged in the output:
- EMPLOYER NAMES (copy verbatim into every experience[].company): ${preserveEmployers || 'none'}
- INSTITUTION NAMES (copy verbatim into every education[].institution): ${preserveInstitutions || 'none'}
- CERTIFICATIONS (only these are allowed in certifications[]): ${preserveCerts || 'none'}
- PROJECT NAMES (only these are allowed in projects[].name): ${preserveProjects || 'none'}
Do NOT create any employer, institution, certification, or project not listed above.

Return valid JSON with this exact schema:
{
  "summary": string or null,
  "experience": [{"title": string, "company": string, "duration": string, "bullets": string[]}],
  "education": [{"degree": string, "institution": string, "year": string, "details": string}],
  "skills": string[],
  "certifications": string[],
  "projects": [{"name": string, "description": string, "technologies": string[]}],
  "other": string[]
}
REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: `Original resume sections:
${JSON.stringify(sections, null, 2)}

Target job description:
${JSON.stringify(jdData, null, 2)}

Identified weaknesses to address:
${weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Enhance the resume to better align with the job description while strictly using only existing information.`,
  };
}

export function buildResumeRefinePrompt(
  currentSections: ResumeSections,
  originalSections: ResumeSections,
  instructions: string
): { system: string; user: string } {
  const preserveEmployers = originalSections.experience.map(e => e.company).filter(Boolean).join(', ');
  const preserveInstitutions = originalSections.education.map(e => e.institution).filter(Boolean).join(', ');
  const preserveCerts = originalSections.certifications.filter(Boolean).join(', ');
  const preserveProjects = originalSections.projects.map(p => p.name).filter(Boolean).join(', ');

  return {
    system: `You are a professional resume writer.
${GROUNDING_INSTRUCTION}
${JSON_ONLY_INSTRUCTION}
Apply the user's specific instructions to refine the resume. Use ONLY information from the original resume.

PRESERVATION RULES — these exact values must appear unchanged in the output:
- EMPLOYER NAMES (copy verbatim into every experience[].company): ${preserveEmployers || 'none'}
- INSTITUTION NAMES (copy verbatim into every education[].institution): ${preserveInstitutions || 'none'}
- CERTIFICATIONS (only these are allowed in certifications[]): ${preserveCerts || 'none'}
- PROJECT NAMES (only these are allowed in projects[].name): ${preserveProjects || 'none'}
Do NOT create any employer, institution, certification, or project not listed above.

Return valid JSON with the same resume sections schema:
{
  "summary": string or null,
  "experience": [{"title": string, "company": string, "duration": string, "bullets": string[]}],
  "education": [{"degree": string, "institution": string, "year": string, "details": string}],
  "skills": string[],
  "certifications": string[],
  "projects": [{"name": string, "description": string, "technologies": string[]}],
  "other": string[]
}
REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: `Current enhanced resume:
${JSON.stringify(currentSections, null, 2)}

Original resume (source of truth):
${JSON.stringify(originalSections, null, 2)}

User instructions: ${instructions}

Apply the instructions while ensuring no fabricated content is added.`,
  };
}

export function buildCoverLetterPrompt(
  sections: ResumeSections,
  jdData: JdExtractedData,
  tone: CoverLetterTone,
  template?: string
): { system: string; user: string } {
  const toneDescriptions: Record<CoverLetterTone, string> = {
    formal: 'Professional, traditional, and polished. Use formal language, structured paragraphs, and conventional business letter format.',
    conversational: 'Warm, approachable, and authentic. Use natural language while maintaining professionalism. Show personality.',
    assertive: 'Confident, direct, and results-oriented. Lead with achievements and use strong action verbs. Be bold but not arrogant.',
  };

  const templateInstruction = template
    ? `Follow this template structure:\n${template}`
    : 'Use a standard professional cover letter format with: opening paragraph, 2-3 body paragraphs, and closing paragraph.';

  return {
    system: `You are a professional cover letter writer.
${GROUNDING_INSTRUCTION}
${JSON_ONLY_INSTRUCTION}
Tone: ${toneDescriptions[tone]}
${templateInstruction}

Return valid JSON:
{
  "content": string (the full cover letter text),
  "word_count": number
}
REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: `Resume:
${JSON.stringify(sections, null, 2)}

Job Description:
${JSON.stringify(jdData, null, 2)}

Write a cover letter for this specific job using only information from the resume. Tone: ${tone}.`,
  };
}

export function buildWritingAnalysisPrompt(text: string, existingIssues: Array<{ type: string; text: string; position: { start: number; end: number } }>): { system: string; user: string } {
  return {
    system: `You are a professional writing assistant specializing in resume and cover letter improvement.
${JSON_ONLY_INSTRUCTION}
Analyze the provided text for writing quality issues. For each issue found, provide a specific suggestion.

The following issues were already detected by deterministic analysis:
${JSON.stringify(existingIssues)}

Find ADDITIONAL issues not already listed. Focus on:
- Weak phrasing that could be stronger
- Grammar risks
- Clarity improvements
- Better word choices

Return valid JSON:
{
  "additional_issues": [
    {
      "type": "weak_phrasing" | "grammar_risk" | "clarity",
      "text": string (the problematic text),
      "suggestion": string (the improved version),
      "position": {"start": number, "end": number},
      "severity": "low" | "medium" | "high"
    }
  ],
  "summary": string (overall writing quality assessment)
}
REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: `Analyze this text for writing quality:\n\n${text}`,
  };
}

export function buildInterviewQuestionsPrompt(
  sections: ResumeSections,
  jdData: JdExtractedData
): { system: string; user: string } {
  return {
    system: `You are an interview preparation expert.
${JSON_ONLY_INSTRUCTION}
Generate interview questions based on the resume and job description.
Include a mix of technical, behavioral, and situational questions.

Return valid JSON:
{
  "questions": [
    {
      "category": "technical" | "behavioral" | "situational",
      "question": string,
      "context": string (why this question is relevant),
      "suggested_approach": string (how to answer well)
    }
  ]
}
Generate exactly 10 questions: 4 technical, 3 behavioral, 3 situational.
REMINDER: Return ONLY the JSON object. No markdown. No explanation. No code fences.`,
    user: `Resume:
${JSON.stringify(sections, null, 2)}

Job Description:
${JSON.stringify(jdData, null, 2)}

Generate interview questions tailored to this candidate and role.`,
  };
}
