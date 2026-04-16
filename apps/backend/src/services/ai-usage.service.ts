/**
 * AI Usage Service – Track and enforce freemium AI request limits.
 *
 * Free tier: 5 AI requests per rolling 24-hour window across ALL features.
 */

import { query, execute } from './db.service.js';

const FREE_TIER_LIMIT = 15;
const WINDOW_HOURS = 24;

export interface UsageStatus {
  used: number;
  limit: number;
  remaining: number;
  resets_at: string | null; // ISO timestamp when the oldest request in the window expires
}

/**
 * Get the current usage status for a user within the rolling window.
 */
export async function getUsageStatus(
  userId: string,
  databaseUrl: string
): Promise<UsageStatus> {
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const rows = await query<{ created_at: string }>(
    databaseUrl,
    `SELECT created_at FROM ai_usage WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at ASC`,
    [userId, windowStart]
  );

  const used = rows.length;
  const remaining = Math.max(0, FREE_TIER_LIMIT - used);

  // The oldest request determines when the window "resets" (i.e. that slot becomes free)
  let resetsAt: string | null = null;
  if (used >= FREE_TIER_LIMIT && rows.length > 0) {
    const oldest = new Date(rows[0].created_at);
    oldest.setHours(oldest.getHours() + WINDOW_HOURS);
    resetsAt = oldest.toISOString();
  }

  return {
    used,
    limit: FREE_TIER_LIMIT,
    remaining,
    resets_at: resetsAt,
  };
}

/**
 * Check if the user can make an AI request. Returns true if allowed.
 */
export async function canUseAi(
  userId: string,
  databaseUrl: string
): Promise<boolean> {
  const status = await getUsageStatus(userId, databaseUrl);
  return status.remaining > 0;
}

/**
 * Record an AI usage event for the user.
 */
export async function recordAiUsage(
  userId: string,
  feature: string,
  databaseUrl: string
): Promise<void> {
  await execute(
    databaseUrl,
    `INSERT INTO ai_usage (id, user_id, feature) VALUES (gen_random_uuid(), $1, $2)`,
    [userId, feature]
  );
}

/**
 * Enforce rate limit: check + throw if over limit. Returns usage status on success.
 * Call this BEFORE performing the AI operation.
 */
export async function enforceAiLimit(
  userId: string,
  feature: string,
  databaseUrl: string
): Promise<UsageStatus> {
  const status = await getUsageStatus(userId, databaseUrl);

  if (status.remaining <= 0) {
    const err = new Error(
      `AI_LIMIT_EXCEEDED|${JSON.stringify(status)}`
    );
    (err as any).status = 429;
    throw err;
  }

  // Record the usage
  await recordAiUsage(userId, feature, databaseUrl);

  return {
    ...status,
    used: status.used + 1,
    remaining: status.remaining - 1,
  };
}
