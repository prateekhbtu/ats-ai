import { Pool, PoolConfig } from '@neondatabase/serverless';

let poolInstance: Pool | null = null;

export function getDb(databaseUrl: string): Pool {
  if (!poolInstance) {
    const config: PoolConfig = { connectionString: databaseUrl };
    poolInstance = new Pool(config);
  }
  return poolInstance;
}

export function freshDb(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

export async function query<T = Record<string, unknown>>(
  databaseUrl: string,
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getDb(databaseUrl);
  // ensure we return row objects correctly
  const result = await pool.query(text, params);
  return (result.rows || []) as unknown as T[];
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
  const pool = getDb(databaseUrl);
  await pool.query(text, params);
}
