// ─── Environment Bindings ──────────────────────────────────────────
export interface Env {
  DATABASE_URL: string;
  VERTEX_AI_PROJECT_ID: string;
  VERTEX_AI_LOCATION: string;
  VERTEX_AI_CLIENT_EMAIL: string;
  VERTEX_AI_PRIVATE_KEY: string;
  GOOGLE_CLIENT_ID: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  RESEND_FROM_NAME: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  FRONTEND_URL: string;
  ENVIRONMENT: string;
}
// ─── LLM Configuration ────────────────────────────────────────────
export interface LlmConfig {
  projectId: string;
  location: string;
  clientEmail: string;
  privateKey: string;
}

// ─── Database Row Types ────────────────────────────────────────────
export interface UserRow {
  id: string;
  google_id: string | null;
  email: string;
  name: string;
  password_hash: string | null;
  picture: string;
  phone: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  email_verified: boolean;
  auth_provider: 'google' | 'email';
  created_at: string;
  updated_at: string;
}

export interface EmailVerificationTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface ResumeRow {
  id: string;
  user_id: string;
  original_filename: string;
  raw_text: string;
  sections: string; // JSON-serialized ResumeSections
  created_at: string;
  updated_at: string;
}

export interface JdRow {
  id: string;
  user_id: string;
  raw_text: string;
  extracted_data: string; // JSON-serialized JdExtractedData
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisRow {
  id: string;
  user_id: string;
  resume_id: string;
  jd_id: string;
  uniscore: number;
  breakdown: string; // JSON-serialized ScoreBreakdown
  strengths: string; // JSON-serialized string[]
  weaknesses: string; // JSON-serialized string[]
  created_at: string;
}

export interface EnhancedResumeRow {
  id: string;
  user_id: string;
  resume_id: string;
  jd_id: string;
  analysis_id: string;
  version: number;
  enhanced_text: string;
  enhanced_sections: string; // JSON-serialized ResumeSections
  diff: string; // JSON-serialized DiffResult[]
  instructions: string | null;
  created_at: string;
}

export interface CoverLetterRow {
  id: string;
  user_id: string;
  resume_id: string;
  jd_id: string;
  tone: CoverLetterTone;
  template: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface VersionRow {
  id: string;
  user_id: string;
  resume_id: string;
  entity_type: 'enhanced_resume' | 'cover_letter';
  entity_id: string;
  version_number: number;
  content_snapshot: string;
  diff?: string;
  created_at: string;
}

// ─── Domain Types ──────────────────────────────────────────────────
export interface ResumeSections {
  summary: string | null;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  certifications: string[];
  projects: ResumeProject[];
  other: string[];
}

export interface ResumeExperience {
  title: string;
  company: string;
  duration: string;
  bullets: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  year: string;
  details: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
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
  analysis_id: string;
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

export type CoverLetterTone = 'formal' | 'conversational' | 'assertive';

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

// ─── API Request/Response Types ────────────────────────────────────
export interface AuthGoogleRequest {
  id_token: string;
}

export interface AuthEmailRegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthEmailLoginRequest {
  email: string;
  password: string;
}

export interface AuthChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthForgotPasswordRequest {
  email: string;
}

export interface AuthResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublicProfile;
}

export interface UserPublicProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  phone: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  email_verified: boolean;
  auth_provider: 'google' | 'email';
}

export interface ProfileUpdateRequest {
  name?: string;
  phone?: string;
  headline?: string;
  location?: string;
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
}

export interface ProfilePictureResponse {
  picture: string;
}

export interface DeleteAccountRequest {
  password?: string; // required for email auth users
}

export interface ResumeUploadResponse {
  id: string;
  sections: ResumeSections;
  raw_text: string;
}

export interface JdProcessRequest {
  text?: string;
  url?: string;
}

export interface JdProcessResponse {
  id: string;
  extracted_data: JdExtractedData;
}

export interface UniScoreRequest {
  resume_id: string;
  jd_id: string;
}

export interface EnhanceResumeRequest {
  resume_id: string;
  jd_id: string;
  analysis_id: string;
}

export interface RefineResumeRequest {
  enhanced_resume_id: string;
  instructions: string;
}

export interface GenerateCoverLetterRequest {
  resume_id: string;
  jd_id: string;
  tone: CoverLetterTone;
  template?: string;
}

export interface WritingAnalyzeRequest {
  text: string;
}

export interface InterviewGenerateRequest {
  resume_id: string;
  jd_id: string;
}

export interface RestoreVersionRequest {
  version_id: string;
}

// ─── JWT Payload ───────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

// ─── Rate Limiter State ────────────────────────────────────────────
export interface RateLimitEntry {
  count: number;
  reset_at: number;
}

// ─── LLM Types ─────────────────────────────────────────────────────
export interface LlmRequest {
  prompt: string;
  system_instruction?: string;
  temperature?: number;
  max_tokens?: number;
  response_schema?: Record<string, unknown>;
  file_data?: {
    mime_type: string;
    data: string; // base64 encoded
  };
}

export interface LlmResponse {
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ─── Hono Context Extension ───────────────────────────────────────
export interface AppVariables {
  userId: string;
  userEmail: string;
  userName: string;
}
