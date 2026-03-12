/**
 * LLM Service – Google Cloud Vertex AI integration.
 * Connects directly to Vertex AI using Service Account credentials.
 */

import type { LlmRequest, LlmResponse, LlmConfig, Env } from '../types/index.js';
import { LlmError } from '../middleware/error-handler.middleware.js';

let cachedToken: { token: string; exp: number } | null = null;

function normalizeEnvValue(value: string | undefined): string {
  if (!value) return '';

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function getLlmConfig(env: Env): LlmConfig {
  const projectId = normalizeEnvValue(env.VERTEX_AI_PROJECT_ID);
  const location = normalizeEnvValue(env.VERTEX_AI_LOCATION);
  const clientEmail = normalizeEnvValue(env.VERTEX_AI_CLIENT_EMAIL);
  const privateKey = normalizeEnvValue(env.VERTEX_AI_PRIVATE_KEY);

  if (!projectId || !location || !clientEmail || !privateKey) {
    throw new LlmError('Vertex AI variables are not fully configured in your environment.');
  }

  return {
    projectId,
    location,
    clientEmail,
    privateKey,
  };
}

export async function callLlm(config: LlmConfig, request: LlmRequest): Promise<LlmResponse> {
  try {
    const accessToken = await getVertexAccessToken(config);
    return await callVertexAiGenerateContent(config, accessToken, request);
  } catch (err: unknown) {
    if (err instanceof LlmError) throw err;
    throw new LlmError(`LLM generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function callVertexAiGenerateContent(config: LlmConfig, accessToken: string, request: LlmRequest): Promise<LlmResponse> {
  const url = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/gemini-2.0-flash:generateContent`;

  const parts: any[] = [];
  if (request.file_data) {
    parts.push({
      inlineData: {
        mimeType: request.file_data.mime_type,
        data: request.file_data.data
      }
    });
  }
  parts.push({ text: request.prompt });

  const payload: any = {
    contents: [
      {
        role: "user",
        parts: parts
      }
    ],
    generationConfig: {
      temperature: request.temperature ?? 0.3,
      maxOutputTokens: request.max_tokens ?? 4096,
    }
  };

  if (request.system_instruction) {
    payload.systemInstruction = {
      role: "system",
      parts: [{ text: request.system_instruction }]
    };
  }

  if (request.response_schema) {
    payload.generationConfig.responseMimeType = "application/json";
    payload.generationConfig.responseSchema = request.response_schema;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Vertex AI error (${res.status}): ${errorBody}`);
  }

  const data = await res.json() as any;
  const candidate = data.candidates?.[0];

  if (!candidate || !candidate.content || !candidate.content.parts) {
    throw new Error(`Invalid response structure from Vertex AI: ${JSON.stringify(data).slice(0, 300)}`);
  }

  const text = candidate.content.parts.map((p: any) => p.text).join('').trim();
  const usage = data.usageMetadata || {};

  return {
    text,
    usage: {
      prompt_tokens: usage.promptTokenCount ?? 0,
      completion_tokens: usage.candidatesTokenCount ?? 0,
      total_tokens: usage.totalTokenCount ?? 0,
    }
  };
}

async function getVertexAccessToken(config: LlmConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 300) {
    return cachedToken.token;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = config.privateKey.replace(/\\n/g, '\n');
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const startIndex = privateKey.indexOf(pemHeader);
  const endIndex = privateKey.indexOf(pemFooter);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Invalid private key format. Expected PEM format.");
  }

  const pemContents = privateKey.substring(startIndex + pemHeader.length, endIndex).replace(/\s+/g, '');

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64UrlEncodeBuffer(signature);
  const jwt = `${signingInput}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to get Google Cloud access token: ${errorBody}`);
  }

  const data = await res.json() as { access_token: string };
  cachedToken = { token: data.access_token, exp: now + 3600 };

  return data.access_token;
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
