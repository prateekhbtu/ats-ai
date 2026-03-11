import { Pool } from '@neondatabase/serverless';
async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(`SELECT '["a", "b"]'::jsonb as weaknesses`);
  console.log(typeof res.rows[0].weaknesses);
  console.log(res.rows[0].weaknesses);
}
test().catch(console.error);
