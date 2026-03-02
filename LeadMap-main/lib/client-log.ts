/**
 * Sends client-side failure logs to the server so they appear in Vercel logs
 * instead of (or in addition to) the browser console.
 */

export interface ServerLogPayload {
  source: string
  level?: 'warn' | 'error'
  message?: string
  data?: Record<string, unknown>
}

/**
 * Sends a log payload to /api/internal/log. Fire-and-forget (does not block).
 * Logs will appear in Vercel function logs.
 */
export function logToServer(payload: ServerLogPayload): void {
  if (typeof fetch === 'undefined') return
  fetch('/api/internal/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Silently ignore network failures - avoid recursive logging
  })
}
