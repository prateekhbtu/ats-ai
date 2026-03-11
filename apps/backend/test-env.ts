import { Hono } from 'hono'
import type { Env } from './src/types/index.js'

const app = new Hono<{ Bindings: Env }>()
app.get('/', (c) => {
  return c.json({
    jwt_secret_length: c.env.JWT_SECRET?.length || 0,
    jwt_secret_chars: c.env.JWT_SECRET ? c.env.JWT_SECRET.substring(0, 5) + '...' : 'null'
  })
})
export default app
