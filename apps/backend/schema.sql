CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT,
  picture TEXT DEFAULT '',
  phone VARCHAR(50),
  headline VARCHAR(500),
  location VARCHAR(255),
  bio TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (auth_provider IN ('google', 'email')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pw_reset_user ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(500) NOT NULL,
  raw_text TEXT NOT NULL,
  sections JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);


CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jd_user_id ON job_descriptions(user_id);


CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  uniscore INTEGER NOT NULL CHECK (uniscore >= 0 AND uniscore <= 100),
  breakdown JSONB NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_resume_jd ON analyses(resume_id, jd_id);


CREATE TABLE IF NOT EXISTS enhanced_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  enhanced_text TEXT NOT NULL,
  enhanced_sections JSONB NOT NULL,
  diff JSONB NOT NULL DEFAULT '[]',
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enhanced_user_id ON enhanced_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_resume_id ON enhanced_resumes(resume_id);


CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  tone VARCHAR(50) NOT NULL CHECK (tone IN ('formal', 'conversational', 'assertive')),
  template VARCHAR(100) DEFAULT 'standard',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id);


CREATE TABLE IF NOT EXISTS versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('enhanced_resume', 'cover_letter')),
  entity_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  content_snapshot JSONB NOT NULL,
  diff JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE versions ADD COLUMN IF NOT EXISTS diff JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_versions_user_resume ON versions(user_id, resume_id);
CREATE INDEX IF NOT EXISTS idx_versions_entity ON versions(entity_type, entity_id);
