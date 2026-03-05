/**
 * Interview Service – Generate interview questions based on resume + JD.
 */

import { getResumeById } from './resume-parser.service.js';
import { getJdById } from './jd-parser.service.js';
import { callLlm } from './llm.service.js';
import { buildInterviewQuestionsPrompt } from '../utils/prompt-builder.js';
import { validateJsonResponse, validateInterviewQuestions } from '../utils/response-validator.js';
import type { InterviewQuestion, Env } from '../types/index.js';
import { LlmError } from '../middleware/error-handler.middleware.js';

export interface InterviewGenerateResult {
  questions: InterviewQuestion[];
  categories_breakdown: {
    technical: number;
    behavioral: number;
    situational: number;
  };
}

export async function generateInterviewQuestions(
  resumeId: string,
  jdId: string,
  userId: string,
  env: Env
): Promise<InterviewGenerateResult> {
  const resume = await getResumeById(resumeId, userId, env.DATABASE_URL);
  const jd = await getJdById(jdId, userId, env.DATABASE_URL);

  const prompt = buildInterviewQuestionsPrompt(resume.sections, jd.extracted_data);

  const llmResponse = await callLlm(env.GEMINI_API_KEY, {
    prompt: prompt.user,
    system_instruction: prompt.system,
    temperature: 0.5,
    max_tokens: 4096,
  });

  const parsed = validateJsonResponse<{ questions: InterviewQuestion[] }>(llmResponse.text);

  if (!parsed.success || !parsed.data) {
    throw new LlmError(`Failed to generate interview questions: ${parsed.error}`);
  }

  if (!validateInterviewQuestions(parsed.data)) {
    throw new LlmError('Generated interview questions have invalid structure');
  }

  const questions = parsed.data.questions;

  // Ensure valid categories
  const validatedQuestions: InterviewQuestion[] = questions.map(q => ({
    category: validateCategory(q.category),
    question: q.question || '',
    context: q.context || '',
    suggested_approach: q.suggested_approach || '',
  }));

  const breakdown = {
    technical: validatedQuestions.filter(q => q.category === 'technical').length,
    behavioral: validatedQuestions.filter(q => q.category === 'behavioral').length,
    situational: validatedQuestions.filter(q => q.category === 'situational').length,
  };

  return {
    questions: validatedQuestions,
    categories_breakdown: breakdown,
  };
}

function validateCategory(category: string): InterviewQuestion['category'] {
  const valid: InterviewQuestion['category'][] = ['technical', 'behavioral', 'situational'];
  if (valid.includes(category as InterviewQuestion['category'])) {
    return category as InterviewQuestion['category'];
  }
  return 'technical';
}
