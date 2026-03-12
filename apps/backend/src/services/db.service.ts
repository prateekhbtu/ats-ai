/**
 * DB Service – uses Neon's HTTP transport (neon()) instead of WebSocket-based
 * Pool so that connections are stateless and per-request, which is required
 * for Cloudflare Workers (Workers forbid reusing I/O objects across requests).
 */
import { neon } from '@neondatabase/serverless';

export async function query<T = Record<string, unknown>>(
  databaseUrl: string,
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = neon(databaseUrl);
  // neon() called as sql(text, params) uses HTTP and returns rows directly
  const rows = await sql(text, params as Parameters<typeof sql>[1]);
  return (rows || []) as unknown as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  databaseUrl: string,
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(databaseUrl, text, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(
  databaseUrl: string,
  text: string,
  params: unknown[] = []
): Promise<void> {
  await query(databaseUrl, text, params);
}
