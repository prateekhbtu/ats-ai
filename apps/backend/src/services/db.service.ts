import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getDb(databaseUrl: string): NeonQueryFunction<false, false> {
  if (!sqlInstance) {
    sqlInstance = neon(databaseUrl);
  }
  return sqlInstance;
}

export function freshDb(databaseUrl: string): NeonQueryFunction<false, false> {
  return neon(databaseUrl);
}

export async function query<T = Record<string, unknown>>(
  databaseUrl: string,
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = freshDb(databaseUrl);
  const result = await sql(text, params);
  return result as unknown as T[];
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
  const sql = freshDb(databaseUrl);
  await sql(text, params);
}
