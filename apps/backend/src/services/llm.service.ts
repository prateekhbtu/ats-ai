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
const DEFAULT_MODEL = 'gemini-2.5-flash';

// ── Proxy (self-hosted on Render free tier) ────────────────────────
// Render cold-starts take 30-90s; give the request plenty of time.
const PROXY_TIMEOUT      = 180_000; // 3 minutes
const PROXY_MAX_RETRIES  = 3;
// Gaps between retries: 30 s after 1st failure, 20 s after 2nd.
const PROXY_RETRY_DELAYS = [30_000, 20_000];

// ── Direct Gemini API ──────────────────────────────────────────────
const DIRECT_TIMEOUT     = 90_000;  // 90 seconds
const DIRECT_MAX_RETRIES = 3;
const DIRECT_RETRY_SEED  = 2_000;   // exponential backoff seed

/**
 * Build an LlmConfig from env vars.
 * Priority: LLM_PROXY_URL (if set) → GEMINI_API_KEY
 * No toggle needed — just set or unset LLM_PROXY_URL.
 */
export function getLlmConfig(env: Env): LlmConfig {
  const proxyUrl = (env.LLM_PROXY_URL ?? '').trim();
  const apiKey = (env.GEMINI_API_KEY ?? '').trim();

  if (!proxyUrl && !apiKey) {
    throw new LlmError('No LLM provider configured. Set LLM_PROXY_URL (hosted proxy) or GEMINI_API_KEY (direct Gemini).');
  }

  return {
    useProxy: proxyUrl.length > 0,
    apiKey,
    proxyUrl,
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

  for (let attempt = 0; attempt < PROXY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      }, PROXY_TIMEOUT);

      // Retryable server-side / gateway errors (incl. Render cold-start 502/503)
      if ([429, 500, 502, 503, 504].includes(response.status)) {
        const snippet = (await response.text()).slice(0, 150);
        lastError = new Error(`HTTP ${response.status}${snippet ? ': ' + snippet : ''}`);
        if (attempt < PROXY_MAX_RETRIES - 1) {
          const delay = PROXY_RETRY_DELAYS[attempt] ?? 10_000;
          console.log(`[LLM proxy] attempt ${attempt + 1} got ${response.status}, retrying in ${delay / 1000}s…`);
          await sleep(delay);
        }
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new LlmError(`LLM proxy error (${response.status}): ${errorBody}`);
      }

      const rawBody = await response.text();
      if (!rawBody.trim()) {
        throw new LlmError('LLM proxy returned an empty body');
      }

      let data: unknown;
      try {
        data = JSON.parse(rawBody);
      } catch {
        // If the body is plain text (not JSON), treat it as the answer directly
        const trimmed = rawBody.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          return { text: trimmed, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
        }
        throw new LlmError(`LLM proxy returned non-JSON response: ${rawBody.slice(0, 300)}`);
      }
      return parseProxyResponse(data);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on definitive client errors
      if (err instanceof LlmError && /\b(400|401|403|422)\b/.test(err.message)) {
        throw err;
      }

      if (attempt < PROXY_MAX_RETRIES - 1) {
        const delay = PROXY_RETRY_DELAYS[attempt] ?? 10_000;
        console.log(`[LLM proxy] attempt ${attempt + 1} error: ${lastError.message}. Retrying in ${delay / 1000}s…`);
        await sleep(delay);
      }
    }
  }

  throw new LlmError(
    `LLM proxy request failed after ${PROXY_MAX_RETRIES} attempts. ` +
    `Last error: ${lastError?.message ?? 'no error details captured'}`
  );
}

function parseProxyResponse(data: unknown): LlmResponse {
  // Shape 1: plain JSON string  e.g. FastAPI returning response.text directly
  if (typeof data === 'string') {
    const text = data.trim();
    if (!text) throw new LlmError('LLM proxy returned empty string response');
    return { text, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
  }

  if (typeof data !== 'object' || data === null) {
    throw new LlmError(`LLM proxy returned unexpected type: ${typeof data}`);
  }

  const obj = data as Record<string, unknown>;
  let text = '';

  // Shape 2: { text: "..." }
  if (typeof obj.text === 'string') {
    text = obj.text;
  }
  // Shape 3: { response: "..." }
  else if (typeof obj.response === 'string') {
    text = obj.response;
  }
  // Shape 4: { output: "..." } or { result: "..." }
  else if (typeof obj.output === 'string') {
    text = obj.output;
  } else if (typeof obj.result === 'string') {
    text = obj.result;
  }
  // Shape 5: Vertex AI / Gemini candidates array (camelCase OR snake_case)
  else if (Array.isArray(obj.candidates)) {
    const candidate = obj.candidates[0] as Record<string, unknown> | undefined;
    if (candidate) {
      const content = (candidate.content ?? candidate.Content) as Record<string, unknown> | undefined;
      if (content) {
        const parts = (content.parts ?? content.Parts) as Array<{ text?: string }> | undefined;
        if (Array.isArray(parts)) {
          text = parts.map(p => p.text ?? '').join('');
        }
      }
    }
  }
  // Shape 6: Vertex AI protobuf-JSON with predictions array
  else if (Array.isArray(obj.predictions)) {
    const first = obj.predictions[0];
    if (typeof first === 'string') {
      text = first;
    } else if (typeof first === 'object' && first !== null) {
      const p = first as Record<string, unknown>;
      text = (typeof p.text === 'string' ? p.text : typeof p.content === 'string' ? p.content : '');
    }
  }

  if (!text.trim()) {
    // Dump the actual shape to help debug
    throw new LlmError(
      `LLM proxy returned unrecognised shape. Keys: [${Object.keys(obj).join(', ')}]. ` +
      `Snippet: ${JSON.stringify(obj).slice(0, 300)}`
    );
  }

  return {
    text: text.trim(),
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
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

  for (let attempt = 0; attempt < DIRECT_MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, DIRECT_TIMEOUT);

      // Retryable Gemini errors – always capture before continue
      if ([429, 500, 503].includes(response.status)) {
        const snippet = (await response.text()).slice(0, 150);
        lastError = new Error(`HTTP ${response.status}${snippet ? ': ' + snippet : ''}`);
        if (attempt < DIRECT_MAX_RETRIES - 1) {
          const delay = DIRECT_RETRY_SEED * Math.pow(2, attempt);
          await sleep(delay);
        }
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

      if (err instanceof LlmError && /\b(400|401|403)\b/.test(err.message)) {
        throw err; // Don't retry client errors
      }

      if (attempt < DIRECT_MAX_RETRIES - 1) {
        const delay = DIRECT_RETRY_SEED * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw new LlmError(
    `Gemini API request failed after ${DIRECT_MAX_RETRIES} attempts. ` +
    `Last error: ${lastError?.message ?? 'no error details captured'}`
  );
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
