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
5. All output must be valid JSON matching the specified schema exactly.`;

export function buildResumeParsePrompt(rawText: string): { system: string; user: string } {
  return {
    system: `You are a resume parsing assistant. Extract structured sections from the resume text.
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
Parse carefully. Do not add any content that is not in the original text.`,
    user: `Parse the following resume text into structured sections:\n\n---BEGIN RESUME---\n${rawText}\n---END RESUME---`,
  };
}

export function buildJdParsePrompt(rawText: string): { system: string; user: string } {
  return {
    system: `You are a job description analysis assistant. Extract structured information from job descriptions.
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
Extract only information present in the text. Use "unknown" for fields that cannot be determined.`,
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
Return valid JSON with this exact schema:
{
  "strengths": string[],
  "weaknesses": string[]
}
Each item should be a specific, actionable observation. Provide 3-7 of each.`,
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
  return {
    system: `You are a professional resume writer specializing in ATS optimization.
${GROUNDING_INSTRUCTION}
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

Return valid JSON with this exact schema:
{
  "summary": string or null,
  "experience": [{"title": string, "company": string, "duration": string, "bullets": string[]}],
  "education": [{"degree": string, "institution": string, "year": string, "details": string}],
  "skills": string[],
  "certifications": string[],
  "projects": [{"name": string, "description": string, "technologies": string[]}],
  "other": string[]
}`,
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
  return {
    system: `You are a professional resume writer.
${GROUNDING_INSTRUCTION}
Apply the user's specific instructions to refine the resume. Use ONLY information from the original resume.

Return valid JSON with the same resume sections schema:
{
  "summary": string or null,
  "experience": [{"title": string, "company": string, "duration": string, "bullets": string[]}],
  "education": [{"degree": string, "institution": string, "year": string, "details": string}],
  "skills": string[],
  "certifications": string[],
  "projects": [{"name": string, "description": string, "technologies": string[]}],
  "other": string[]
}`,
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
Tone: ${toneDescriptions[tone]}
${templateInstruction}

Return valid JSON:
{
  "content": string (the full cover letter text),
  "word_count": number
}`,
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
}`,
    user: `Analyze this text for writing quality:\n\n${text}`,
  };
}

export function buildInterviewQuestionsPrompt(
  sections: ResumeSections,
  jdData: JdExtractedData
): { system: string; user: string } {
  return {
    system: `You are an interview preparation expert.
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
Generate exactly 10 questions: 4 technical, 3 behavioral, 3 situational.`,
    user: `Resume:
${JSON.stringify(sections, null, 2)}

Job Description:
${JSON.stringify(jdData, null, 2)}

Generate interview questions tailored to this candidate and role.`,
  };
}
