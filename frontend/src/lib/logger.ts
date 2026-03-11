/**
 * logger.ts — Controlled by the VITE_ENABLE_LOGS env var.
 *
 * Set VITE_ENABLE_LOGS=true  in .env to see all API traffic in DevTools.
 * Set VITE_ENABLE_LOGS=false to silence all logs for production.
 *
 * The value is baked in at compile time by vite.config.ts, so changing
 * it requires a page reload (or HMR restart in dev mode).
 */

const ENABLED = import.meta.env.VITE_ENABLE_LOGS === 'true';

type PlainObject = Record<string, unknown>;

/** Remove sensitive fields before printing to console. */
function sanitize(body: PlainObject): PlainObject {
  const copy: PlainObject = { ...body };
  for (const key of ['password', 'current_password', 'new_password', 'id_token']) {
    if (key in copy) copy[key] = '[REDACTED]';
  }
  return copy;
}

export const logger = {
  /**
   * Log an outgoing API request.
   * @param method HTTP verb (GET, POST, …)
   * @param endpoint Path relative to API_BASE, e.g. "/api/auth/login"
   * @param body   Parsed JSON body or FormData placeholder string
   */
  request(method: string, endpoint: string, body?: PlainObject | string) {
    if (!ENABLED) return;
    console.groupCollapsed(`%c→ ${method} ${endpoint}`, 'color:#f97316;font-weight:bold');
    console.log('time:', new Date().toISOString());
    if (body !== undefined) {
      const display = typeof body === 'object' ? sanitize(body) : body;
      console.log('body:', display);
    }
    console.groupEnd();
  },

  /**
   * Log a successful API response.
   */
  response(method: string, endpoint: string, status: number, data?: unknown) {
    if (!ENABLED) return;
    const style = 'color:#22c55e;font-weight:bold';
    console.groupCollapsed(`%c← ${status} ${method} ${endpoint}`, style);
    console.log('time:', new Date().toISOString());
    if (data !== undefined) console.log('data:', data);
    console.groupEnd();
  },

  /**
   * Log a failed API response.
   * @param error   The top-level "error" field from the backend JSON
   * @param detail  The "message" field (present on 500s with extra context)
   */
  error(method: string, endpoint: string, status: number, error: string, detail?: string) {
    if (!ENABLED) return;
    console.group(`%c✗ ${status} ${method} ${endpoint}`, 'color:#ef4444;font-weight:bold');
    console.error('error:', error);
    if (detail && detail !== error) console.error('detail:', detail);
    console.log('time:', new Date().toISOString());
    console.groupEnd();
  },
};
