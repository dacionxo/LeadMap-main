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
 * Never throws — failures are ignored to avoid breaking the app.
 */
export function logToServer(payload: ServerLogPayload): void {
  try {
    if (typeof fetch === 'undefined') return
    const body = JSON.stringify({
      source: payload.source,
      level: payload.level ?? 'warn',
      message: payload.message,
      data: payload.data ?? {},
    })
    fetch('/api/internal/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* ignore */ })
  } catch {
    // Never throw — avoid breaking the app
  }
}
