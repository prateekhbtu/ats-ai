/**
 * LLM Service – Centralized Gemini API integration.
 * Handles all LLM communication with retry, timeout, and validation.
 */

import type { LlmRequest, LlmResponse } from '../types/index.js';
import { LlmError } from '../middleware/error-handler.middleware.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 60_000;

export async function callLlm(apiKey: string, request: LlmRequest): Promise<LlmResponse> {
  const url = `${GEMINI_API_BASE}/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

  const body = buildGeminiRequest(request);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, REQUEST_TIMEOUT);

      if (response.status === 429) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      if (response.status === 503 || response.status === 500) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new LlmError(`Gemini API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json() as GeminiResponse;
      return parseGeminiResponse(data);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof LlmError && (err.message.includes('400') || err.message.includes('403'))) {
        throw err; // Don't retry client errors
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw new LlmError(`LLM request failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

function buildGeminiRequest(request: LlmRequest): GeminiRequestBody {
  const body: GeminiRequestBody = {
    contents: [
      {
        parts: [{ text: request.prompt }],
      },
    ],
    generationConfig: {
      temperature: request.temperature ?? 0.3,
      maxOutputTokens: request.max_tokens ?? 8192,
      responseMimeType: 'text/plain',
    },
  };

  if (request.system_instruction) {
    body.systemInstruction = {
      parts: [{ text: request.system_instruction }],
    };
  }

  return body;
}

function parseGeminiResponse(data: GeminiResponse): LlmResponse {
  if (!data.candidates || data.candidates.length === 0) {
    throw new LlmError('Gemini returned no candidates');
  }

  const candidate = data.candidates[0];

  if (candidate.finishReason === 'SAFETY') {
    throw new LlmError('Gemini response blocked by safety filters');
  }

  if (!candidate.content?.parts || candidate.content.parts.length === 0) {
    throw new LlmError('Gemini returned empty content');
  }

  const text = candidate.content.parts.map(p => p.text || '').join('');

  const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

  return {
    text,
    usage: {
      prompt_tokens: usage.promptTokenCount || 0,
      completion_tokens: usage.candidatesTokenCount || 0,
      total_tokens: usage.totalTokenCount || 0,
    },
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LlmError(`LLM request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Gemini Types ──────────────────────────────────────────────────
interface GeminiRequestBody {
  contents: Array<{
    parts: Array<{ text: string }>;
  }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    responseMimeType: string;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}
