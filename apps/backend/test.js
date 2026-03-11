import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://user:pass@host/db');
sql('SELECT * FROM users WHERE id = $1', ['1']).catch(e => console.error(e.message));
