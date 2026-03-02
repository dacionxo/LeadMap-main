/**
 * Internal log endpoint - receives client-side failure logs and emits them
 * server-side so they appear in Vercel function logs instead of browser console.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface LogPayload {
  source: string
  level?: 'warn' | 'error'
  message?: string
  data?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source, level = 'warn', message, data } = body as LogPayload

    if (!source || typeof source !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing source' }, { status: 400 })
    }

    const logLine = `[${source}] ${message ?? 'Failure'}` + (data ? ` ${JSON.stringify(data)}` : '')
    if (level === 'error') {
      console.error(logLine)
    } else {
      console.warn(logLine)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[internal/log] Failed to process log payload:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
