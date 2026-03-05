import { Context, Next } from 'hono';
import type { Env, AppVariables, RateLimitEntry } from '../types/index.js';

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (entry.reset_at < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: 'global',
};

export function rateLimiter(config: Partial<RateLimitConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context<{ Bindings: Env; Variables: AppVariables }>, next: Next): Promise<Response | void> => {
    cleanup();

    const identifier = c.get('userId') || c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'anonymous';
    const key = `${cfg.keyPrefix}:${identifier}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.reset_at < now) {
      entry = { count: 0, reset_at: now + cfg.windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, cfg.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.reset_at - now) / 1000);

    c.header('X-RateLimit-Limit', cfg.maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetSeconds.toString());

    if (entry.count > cfg.maxRequests) {
      return c.json(
        {
          error: 'Too many requests',
          retry_after: resetSeconds,
        },
        429
      );
    }

    await next();
  };
}

export function strictRateLimiter() {
  return rateLimiter({ windowMs: 60_000, maxRequests: 10, keyPrefix: 'strict' });
}

export function llmRateLimiter() {
  return rateLimiter({ windowMs: 60_000, maxRequests: 15, keyPrefix: 'llm' });
}
