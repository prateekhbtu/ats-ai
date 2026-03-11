import { logger } from './logger';

// ─── API Base ───────────────────────────────────────────────────────────────
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8787';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Let the browser set Content-Type for FormData (handles boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Build a loggable body (parse JSON strings; mark FormData uploads)
  let logBody: Record<string, unknown> | string | undefined;
  if (typeof options.body === 'string') {
    try {
      logBody = JSON.parse(options.body) as Record<string, unknown>;
    } catch {
      logBody = options.body;
    }
  } else if (options.body instanceof FormData) {
    logBody = '[FormData upload]';
  }

  logger.request(method, endpoint, logBody);

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    // Parse the backend error body.
    // On 500s the backend sends: { error: "Internal server error", code: "INTERNAL_ERROR", message: "actual cause" }
    // On known errors it sends:  { error: "<readable message>", code: "<CODE>" }
    // We prefer `message` (detail) when present, otherwise fall back to `error`.
    const errBody = await res.json().catch(() => ({ error: 'Request failed' })) as {
      error?: string;
      code?: string;
      message?: string;
    };
    const displayMessage = errBody.message ?? errBody.error ?? `HTTP ${res.status}`;
    logger.error(method, endpoint, res.status, errBody.error ?? `HTTP ${res.status}`, errBody.message);
    throw new ApiError(res.status, displayMessage, errBody.code);
  }

  // 204 No Content
  if (res.status === 204) {
    logger.response(method, endpoint, 204);
    return undefined as T;
  }

  const data = await res.json() as T;
  logger.response(method, endpoint, res.status, data);
  return data;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: PublicProfile;
}

export interface PublicProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  phone?: string | null;
  headline?: string | null;
  location?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  email_verified: boolean;
  auth_provider: 'google' | 'email';
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  headline?: string;
  location?: string;
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
}

export interface ResumeSections {
  summary?: string | null;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    bullets: string[];
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
    details?: string;
  }>;
  skills?: string[];
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  other?: string[];
}

export interface ResumeDetail {
  id: string;
  original_filename: string;
  raw_text: string;
  sections: ResumeSections;
  created_at: string;
  updated_at: string;
}

export interface JdExtractedData {
  title: string;
  company: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_requirements: string;
  role_expectations: string[];
  industry: string;
  seniority_level: string;
}

export interface ScoreBreakdown {
  keyword_match: number;
  market_alignment: number;
  section_completeness: number;
  readability: number;
  experience_depth: number;
}

export interface UniScoreResult {
  id: string;
  uniscore: number;
  breakdown: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
}

export interface DiffResult {
  section: string;
  original: string;
  enhanced: string;
  change_type: 'modified' | 'added' | 'removed' | 'unchanged';
}

export interface EnhancedResumeResult {
  id: string;
  version: number;
  enhanced_sections: ResumeSections;
  diff: DiffResult[];
}

export interface WritingIssue {
  type: 'weak_phrasing' | 'long_sentence' | 'passive_voice' | 'grammar_risk' | 'clarity';
  text: string;
  suggestion: string;
  position: { start: number; end: number };
  severity: 'low' | 'medium' | 'high';
}

export interface WritingAnalysisResult {
  issues: WritingIssue[];
  overall_score: number;
  summary: string;
}

export interface InterviewQuestion {
  category: 'technical' | 'behavioral' | 'situational';
  question: string;
  context: string;
  suggested_approach: string;
}

export interface Version {
  id: string;
  entity_type: string;
  entity_id: string;
  version_number: number;
  created_at: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  google: (id_token: string) =>
    request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token }),
    }),

  register: (email: string, password: string, name: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyEmail: (token: string) =>
    request<{ message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerify: () =>
    request<{ message: string }>('/api/auth/resend-verify', { method: 'POST' }),

  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => request<{ profile: PublicProfile }>('/api/profile'),

  update: (data: ProfileUpdateData) =>
    request<{ profile: PublicProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (password?: string) =>
    request<{ message: string }>('/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  uploadPicture: (file: File) => {
    const form = new FormData();
    form.append('picture', file);
    return request<{ profile: PublicProfile }>('/api/profile/picture', {
      method: 'POST',
      body: form,
    });
  },

  removePicture: () =>
    request<{ message: string }>('/api/profile/picture', { method: 'DELETE' }),
};

// ─── Resume ───────────────────────────────────────────────────────────────────

export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ id: string; sections: ResumeSections; raw_text: string }>(
      '/api/resume/upload',
      { method: 'POST', body: form },
    );
  },

  get: (id: string) => request<{ resume: ResumeDetail }>(`/api/resume/${id}`),
};

// ─── Job Description ──────────────────────────────────────────────────────────

export const jdApi = {
  process: (data: { text?: string; url?: string }) =>
    request<{ id: string; extracted_data: JdExtractedData }>('/api/jd/process', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Analysis ─────────────────────────────────────────────────────────────────

export const analysisApi = {
  uniscore: (resume_id: string, jd_id: string) =>
    request<UniScoreResult>('/api/analysis/uniscore', {
      method: 'POST',
      body: JSON.stringify({ resume_id, jd_id }),
    }),
};

// ─── Enhancer ─────────────────────────────────────────────────────────────────

export const enhancerApi = {
  enhance: (resume_id: string, jd_id: string, analysis_id: string) =>
    request<EnhancedResumeResult>('/api/enhancer/resume', {
      method: 'POST',
      body: JSON.stringify({ resume_id, jd_id, analysis_id }),
    }),

  refine: (enhanced_resume_id: string, instructions: string) =>
    request<EnhancedResumeResult>('/api/enhancer/refine', {
      method: 'POST',
      body: JSON.stringify({ enhanced_resume_id, instructions }),
    }),
};

// ─── Cover Letter ─────────────────────────────────────────────────────────────

export const coverLetterApi = {
  generate: (
    resume_id: string,
    jd_id: string,
    tone: 'formal' | 'conversational' | 'assertive',
    template?: string,
  ) =>
    request<{ id: string; tone: string; content: string }>(
      '/api/cover-letter/generate',
      {
        method: 'POST',
        body: JSON.stringify({ resume_id, jd_id, tone, template }),
      },
    ),
};

// ─── Interview ────────────────────────────────────────────────────────────────

export const interviewApi = {
  generate: (resume_id: string, jd_id: string) =>
    request<{ questions: InterviewQuestion[] }>('/api/interview/generate', {
      method: 'POST',
      body: JSON.stringify({ resume_id, jd_id }),
    }),
};

// ─── Writing ──────────────────────────────────────────────────────────────────

export const writingApi = {
  analyze: (text: string) =>
    request<WritingAnalysisResult>('/api/writing/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

// ─── Version ──────────────────────────────────────────────────────────────────

export const versionApi = {
  getHistory: (resume_id: string) =>
    request<{ versions: Version[] }>(`/api/version/${resume_id}`),

  restore: (version_id: string) =>
    request<{ message: string }>('/api/version/restore', {
      method: 'POST',
      body: JSON.stringify({ version_id }),
    }),
};
