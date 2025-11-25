'use client'

/**
 * Utility helpers to normalize and compare listing identifiers.
 * Identifiers can be traditional listing IDs or property URLs.
 */

const TRAILING_SLASH_REGEX = /\/+$/

/**
 * Basic heuristic to determine whether a string is most likely a URL.
 */
export function isProbablyUrl(value: string) {
  const lower = value.toLowerCase()
  return (
    lower.includes('http://') ||
    lower.includes('https://') ||
    lower.startsWith('www.') ||
    lower.includes('.com') ||
    lower.includes('.net') ||
    lower.includes('.org') ||
    lower.includes('.io')
  )
}

/**
 * Normalize a URL string so comparisons are reliable.
 */
function normalizeUrl(value: string) {
  let working = value.trim()
  if (!working) return working

  if (!working.toLowerCase().startsWith('http')) {
    working = `https://${working}`
  }

  try {
    const url = new URL(working)
    let pathname = url.pathname || ''
    pathname = pathname.replace(TRAILING_SLASH_REGEX, '')
    const normalized = `${url.protocol}//${url.host}${pathname}${url.search ? url.search : ''}`
    return normalized.toLowerCase()
  } catch {
    return working.toLowerCase()
  }
}

/**
 * Normalize any listing identifier. Returns the most canonical form.
 * @param value - The listing identifier to normalize (can be a listing ID or property URL)
 * @returns The normalized identifier, or null if the input is invalid
 */
export function normalizeListingIdentifier(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (isProbablyUrl(trimmed)) {
    return normalizeUrl(trimmed)
  }
  return trimmed
}

/**
 * Generate a set of candidate identifiers to maximize match success.
 * Useful when comparing identifiers that might include trailing slashes, queries, etc.
 */
export function generateIdentifierCandidates(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return []

  const candidates: string[] = []
  const seen = new Set<string>()

  const addCandidate = (candidate: string) => {
    if (candidate && !seen.has(candidate)) {
      seen.add(candidate)
      candidates.push(candidate)
    }
  }

  if (isProbablyUrl(trimmed)) {
    const normalized = normalizeUrl(trimmed)
    addCandidate(normalized)

    const noQuery = normalized.split('?')[0]
    addCandidate(noQuery)

    const noTrailingSlash = noQuery.replace(TRAILING_SLASH_REGEX, '')
    addCandidate(noTrailingSlash)

    const httpsVersion = normalized.replace(/^http:\/\//, 'https://')
    addCandidate(httpsVersion)
  } else {
    addCandidate(trimmed)
    const compressed = trimmed.replace(/\s+/g, '')
    addCandidate(compressed)
  }

  return candidates
}


