/**
 * LLM Service – Centralized LLM integration.
 * Supports two modes:
 *   1. Direct Gemini API (via API key)
 *   2. Self-hosted proxy (e.g. Vertex AI on Cloud Run / Render)
 * Toggle via USE_LLM_PROXY env var.
 */

import type { LlmRequest, LlmResponse, LlmConfig, Env } from '../types/index.js';
import { LlmError } from '../middleware/error-handler.middleware.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 60_000;

/**
 * Build an LlmConfig from env vars.
 * All services that have access to `env` should use this.
 */
export function getLlmConfig(env: Env): LlmConfig {
  return {
    useProxy: env.USE_LLM_PROXY === 'true',
    apiKey: env.GEMINI_API_KEY ?? '',
    proxyUrl: env.LLM_PROXY_URL ?? '',
  };
}

/**
 * Unified LLM call — dispatches to proxy or direct Gemini based on config.
 */
export async function callLlm(config: LlmConfig, request: LlmRequest): Promise<LlmResponse> {
  if (config.useProxy) {
    return callLlmProxy(config.proxyUrl, request);
  }
  return callLlmDirect(config.apiKey, request);
}

// ─── Proxy Mode ────────────────────────────────────────────────────

async function callLlmProxy(proxyUrl: string, request: LlmRequest): Promise<LlmResponse> {
  if (!proxyUrl) {
    throw new LlmError('LLM_PROXY_URL is not configured');
  }

  // Combine system instruction + prompt into a single text payload
  const parts: string[] = [];
  if (request.system_instruction) {
    parts.push(request.system_instruction);
  }
  parts.push(request.prompt);
  const fullText = parts.join('\n\n');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      }, REQUEST_TIMEOUT);

      if (response.status === 429 || response.status === 503 || response.status === 500) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new LlmError(`LLM proxy error (${response.status}): ${errorBody}`);
      }

      const data = await response.json() as Record<string, unknown>;
      return parseProxyResponse(data);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof LlmError && (err.message.includes('400') || err.message.includes('403'))) {
        throw err;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw new LlmError(`LLM proxy request failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

function parseProxyResponse(data: Record<string, unknown>): LlmResponse {
  // The proxy may return various shapes — handle common patterns:
  // 1. { text: "..." }  (simple)
  // 2. { response: "..." }
  // 3. { candidates: [...] }  (Gemini-like passthrough)
  // 4. Plain string at top-level (unlikely from JSON parse)

  let text = '';

  if (typeof data.text === 'string') {
    text = data.text;
  } else if (typeof data.response === 'string') {
    text = data.response;
  } else if (typeof data.output === 'string') {
    text = data.output;
  } else if (Array.isArray(data.candidates)) {
    // Gemini-style passthrough
    const candidate = data.candidates[0] as Record<string, unknown> | undefined;
    if (candidate?.content && typeof candidate.content === 'object') {
      const content = candidate.content as { parts?: Array<{ text?: string }> };
      text = content.parts?.map(p => p.text || '').join('') ?? '';
    }
  } else {
    // Last resort: stringify it
    text = JSON.stringify(data);
  }

  if (!text) {
    throw new LlmError('LLM proxy returned empty response');
  }

  return {
    text,
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

// ─── Direct Gemini Mode ────────────────────────────────────────────

async function callLlmDirect(apiKey: string, request: LlmRequest): Promise<LlmResponse> {
  if (!apiKey) {
    throw new LlmError('GEMINI_API_KEY is not configured');
  }

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
