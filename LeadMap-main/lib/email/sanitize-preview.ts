/**
 * Sanitizers for email preview/preheader text and HTML.
 *
 * We previously used invisible padding sequences (e.g. "&#8199;&#65279;&#847;")
 * to influence inbox previews. Some clients surface these literally; we strip them.
 */

const PREVIEW_ARTIFACTS_REGEX =
  /(?:&amp;)?&#(?:8199|65279|847);/g

const PREVIEW_ARTIFACT_CHARS_REGEX =
  /[\u2007\uFEFF\u034F]/g

export function stripPreviewArtifacts(input: string): string {
  return (input || '')
    .replace(PREVIEW_ARTIFACTS_REGEX, '')
    .replace(PREVIEW_ARTIFACT_CHARS_REGEX, '')
}

export function escapeHtmlText(input: string): string {
  // IMPORTANT: escape '&' first so we don't double-escape later replacements.
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildHiddenPreheader(previewText: string): string {
  const clean = stripPreviewArtifacts(previewText).trim()
  if (!clean) return ''

  const escaped = escapeHtmlText(clean)
  // More robust hiding across common email clients.
  const style =
    'display:none!important;' +
    'font-size:1px;' +
    'line-height:1px;' +
    'max-height:0;' +
    'max-width:0;' +
    'opacity:0;' +
    'overflow:hidden;' +
    'mso-hide:all;' +
    'color:transparent;'

  return `<div style="${style}">${escaped}</div>`
}

export function stripArtifactsFromHtml(html: string): string {
  return stripPreviewArtifacts(html)
}

