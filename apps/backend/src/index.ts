/**

* AI Resume Optimizer – Backend Entry Point
* Cloudflare Workers + Hono
  */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'

import type { Env, AppVariables } from './types/index.js'

import { errorHandler } from './middleware/error-handler.middleware.js'
import { rateLimiter } from './middleware/rate-limiter.middleware.js'

import { openApiSpec } from './openapi.js'

// Route imports
import authRoutes from './routes/auth.routes.js'
import resumeRoutes from './routes/resume.routes.js'
import jdRoutes from './routes/jd.routes.js'
import analysisRoutes from './routes/analysis.routes.js'
import enhancerRoutes from './routes/enhancer.routes.js'
import coverLetterRoutes from './routes/cover-letter.routes.js'
import writingRoutes from './routes/writing.routes.js'
import interviewRoutes from './routes/interview.routes.js'
import versionRoutes from './routes/version.routes.js'
import profileRoutes from './routes/profile.routes.js'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// ─────────────────────────────────────────────────────────────
// Global Middleware
// ─────────────────────────────────────────────────────────────

// CORS
app.use(
'/*',
cors({
origin: '*',
allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowHeaders: ['Content-Type', 'Authorization', 'X-Filename'],
exposeHeaders: [
'X-RateLimit-Limit',
'X-RateLimit-Remaining',
'X-RateLimit-Reset',
],
maxAge: 86400,
})
)

// Global rate limiter
app.use(
'/api/*',
rateLimiter({
windowMs: 60_000,
maxRequests: 60,
keyPrefix: 'global',
})
)

// ─────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────

app.get('/', (c) => {
return c.json({
name: 'AI Resume Optimizer API',
version: '1.0.0',
status: 'healthy',
timestamp: new Date().toISOString(),
})
})

app.get('/health', (c) => {
return c.json({ status: 'ok' })
})

// ─────────────────────────────────────────────────────────────
// OpenAPI Spec + Swagger UI
// ─────────────────────────────────────────────────────────────

// Dynamic OpenAPI spec with automatic server detection
app.get('/openapi.json', (c) => {
const url = new URL(c.req.url)
const baseUrl = `${url.protocol}//${url.host}`

return c.json({
...openApiSpec,
servers: [
{
url: baseUrl,
description: 'Current environment',
},
],
})
})

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// ─────────────────────────────────────────────────────────────
// Debug (remove after verifying production setup)
// ─────────────────────────────────────────────────────────────

app.get('/debug/env', (c) => {
  const check = (key: string, val: unknown) => {
    if (!val || (typeof val === 'string' && val.trim() === '')) return 'MISSING'
    const s = String(val)
    return `SET (${s.length} chars, starts: ${s.slice(0, 4)}...)`
  }

  return c.json({
    DATABASE_URL: check('DATABASE_URL', c.env.DATABASE_URL),
    GEMINI_API_KEY: check('GEMINI_API_KEY', c.env.GEMINI_API_KEY),
    GOOGLE_CLIENT_ID: check('GOOGLE_CLIENT_ID', c.env.GOOGLE_CLIENT_ID),
    JWT_SECRET: check('JWT_SECRET', c.env.JWT_SECRET),
    RESEND_API_KEY: check('RESEND_API_KEY', c.env.RESEND_API_KEY),
    RESEND_FROM_EMAIL: check('RESEND_FROM_EMAIL', c.env.RESEND_FROM_EMAIL),
    RESEND_FROM_NAME: check('RESEND_FROM_NAME', c.env.RESEND_FROM_NAME),
    CLOUDINARY_CLOUD_NAME: check('CLOUDINARY_CLOUD_NAME', c.env.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: check('CLOUDINARY_API_KEY', c.env.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: check('CLOUDINARY_API_SECRET', c.env.CLOUDINARY_API_SECRET),
    FRONTEND_URL: check('FRONTEND_URL', c.env.FRONTEND_URL),
    ENVIRONMENT: check('ENVIRONMENT', c.env.ENVIRONMENT),
  })
})

app.get('/debug/db', async (c) => {
  try {
    const { freshDb } = await import('./services/db.service.js')
    const sql = freshDb(c.env.DATABASE_URL)
    const result = await sql('SELECT NOW() as time, current_database() as db')
    return c.json({ status: 'connected', result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ status: 'failed', error: message }, 500)
  }
})

// ─────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────

app.route('/api/auth', authRoutes)
app.route('/api/profile', profileRoutes)
app.route('/api/resume', resumeRoutes)
app.route('/api/jd', jdRoutes)
app.route('/api/analysis', analysisRoutes)
app.route('/api/enhancer', enhancerRoutes)
app.route('/api/cover-letter', coverLetterRoutes)
app.route('/api/writing', writingRoutes)
app.route('/api/interview', interviewRoutes)
app.route('/api/version', versionRoutes)

app.notFound((c) => {
return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
})

app.onError(errorHandler)

export default app
