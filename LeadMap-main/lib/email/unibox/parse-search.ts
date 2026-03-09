export type UniboxSearchParsed = {
  /** Remaining free-text query (websearch_to_tsquery input) */
  text: string
  subject?: string
  from?: string
  to?: string
  hasAttachment?: boolean
  isRead?: boolean
  isUnread?: boolean
  after?: string
  before?: string
}

/**
 * Parses a Unibox search string into structured filters.
 *
 * Supported (case-insensitive):
 * - subject:<text>
 * - from:<email|name>
 * - to:<email|name>
 * - has:attachment
 * - is:read | is:unread
 * - after:YYYY-MM-DD | before:YYYY-MM-DD
 *
 * Everything else becomes `text` (used for full-text search).
 */
export function parseUniboxSearchQuery(input: string): UniboxSearchParsed {
  const raw = (input ?? '').trim()
  if (!raw) return { text: '' }

  const tokens = tokenize(raw)
  const out: UniboxSearchParsed = { text: '' }
  const textParts: string[] = []

  for (const tok of tokens) {
    const m = tok.match(/^([a-zA-Z_]+)\:(.+)$/)
    if (!m) {
      textParts.push(tok)
      continue
    }

    const key = m[1]?.toLowerCase()
    const value = stripQuotes((m[2] ?? '').trim())

    if (!value) continue

    switch (key) {
      case 'subject':
        out.subject = value
        break
      case 'from':
        out.from = value
        break
      case 'to':
        out.to = value
        break
      case 'has':
        if (value.toLowerCase() === 'attachment') out.hasAttachment = true
        break
      case 'is': {
        const v = value.toLowerCase()
        if (v === 'read') out.isRead = true
        else if (v === 'unread') out.isUnread = true
        break
      }
      case 'after':
        if (looksLikeDate(value)) out.after = value
        else textParts.push(tok)
        break
      case 'before':
        if (looksLikeDate(value)) out.before = value
        else textParts.push(tok)
        break
      default:
        textParts.push(tok)
        break
    }
  }

  out.text = textParts.join(' ').trim()
  return out
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

function looksLikeDate(s: string): boolean {
  // Basic YYYY-MM-DD check (kept strict to avoid surprises)
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function tokenize(input: string): string[] {
  // Split on whitespace while keeping quoted phrases intact.
  // Example: subject:"hello world" -> token subject:"hello world"
  const tokens: string[] = []
  let cur = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quote) {
      cur += ch
      if (ch === quote) quote = null
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
      continue
    }

    if (/\s/.test(ch)) {
      if (cur.trim()) tokens.push(cur.trim())
      cur = ''
      continue
    }

    cur += ch
  }

  if (cur.trim()) tokens.push(cur.trim())
  return tokens
}

