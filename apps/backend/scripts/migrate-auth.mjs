/**
 * ALTER migration – adds new auth/profile columns to existing users table
 * and creates email_verification_tokens + password_reset_tokens tables.
 *
 * Safe to re-run (uses IF NOT EXISTS / IF EXISTS checks).
 *
 * Run:  DATABASE_URL=<url> node scripts/migrate-auth.mjs
 * Or:   npm run db:migrate:auth
 */

import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

const alterStatements = [
  // ── Fix existing columns ──────────────────────────────────────
  `ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL`,

  // ── New columns on users ──────────────────────────────────────
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR(500)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'email'`,

  // ── Email verification tokens ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token)`,
  `CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id)`,

  // ── Password reset tokens ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_reset_tokens(token)`,
  `CREATE INDEX IF NOT EXISTS idx_pw_reset_user ON password_reset_tokens(user_id)`,
]

async function migrate() {
  const url = new URL(DATABASE_URL)
  console.log(`Migrating: ${url.pathname.slice(1)} on ${url.hostname}`)
  console.log('Applying auth/profile ALTER migration...\n')

  for (const stmt of alterStatements) {
    try {
      await sql(stmt)
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 80)
      console.log(`✓ ${preview}...`)
    } catch (err) {
      console.error(`✗ Failed: ${stmt.replace(/\s+/g, ' ').slice(0, 80)}...`)
      console.error(`  Error: ${err.message}`)
      process.exit(1)
    }
  }

  console.log('\n✓ Auth/profile migration complete!\n')
}

migrate()
