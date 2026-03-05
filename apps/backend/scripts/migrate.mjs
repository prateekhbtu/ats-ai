/**
 * Database migration script.
 * Run:
 *   DATABASE_URL=<your_url> node scripts/migrate.mjs
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set')
  process.exit(1)
}

function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let inString = false

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const prev = sql[i - 1]

    // Toggle string mode on unescaped single quotes
    if (char === "'" && prev !== '\\') {
      inString = !inString
    }

    if (char === ';' && !inString) {
      if (current.trim()) {
        statements.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

async function migrate() {
  try {
    const schemaPath = resolve(__dirname, '..', 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')

    const url = new URL(DATABASE_URL)
    const host = url.hostname
    const dbName = url.pathname.slice(1)

    console.log(`Migrating database: ${dbName} on ${host}`)
    console.log('Applying schema...\n')

    const sql = neon(DATABASE_URL)
    const statements = splitSqlStatements(schema)

    for (const statement of statements) {
      if (!statement || statement.startsWith('--')) continue

      try {
        await sql(statement)
        const preview = statement.split('\n')[0]
        console.log(`✓ ${preview.slice(0, 80)}...`)
      } catch (err) {
        console.error(`✗ Failed: ${statement.slice(0, 80)}...`)
        console.error(`  Error: ${err.message}`)
        process.exit(1)
      }
    }

    console.log('\n✓ Migration complete!\n')
  } catch (err) {
    console.error('\n✗ Migration failed:')
    console.error(err.message)
    process.exit(1)
  }
}

migrate()