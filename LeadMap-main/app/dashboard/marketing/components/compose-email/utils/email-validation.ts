/**
 * Email Validation Utilities
 * HTML, link, and email validation following Mautic patterns
 * Following .cursorrules: TypeScript interfaces, error handling
 */

export interface ValidationError {
  type: 'html' | 'link' | 'image' | 'accessibility' | 'compatibility'
  message: string
  severity: 'error' | 'warning' | 'info'
  element?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
}

/**
 * Validate HTML content
 */
export function validateHTML(html: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []

  // Check for basic HTML structure
  if (!html || html.trim().length === 0) {
    errors.push({
      type: 'html',
      message: 'Email content is empty',
      severity: 'error',
    })
  }

  // Check for unclosed tags (basic check)
  const openTags = (html.match(/<[^/][^>]*>/g) || []).length
  const closeTags = (html.match(/<\/[^>]+>/g) || []).length
  if (Math.abs(openTags - closeTags) > 5) {
    warnings.push({
      type: 'html',
      message: 'Potential unclosed HTML tags detected',
      severity: 'warning',
    })
  }

  // Check for inline styles (recommended for email)
  const hasInlineStyles = html.includes('style=')
  if (!hasInlineStyles) {
    info.push({
      type: 'html',
      message: 'Consider using inline styles for better email client compatibility',
      severity: 'info',
    })
  }

  // Check for table-based layout (recommended for email)
  const hasTables = html.includes('<table')
  if (!hasTables) {
    warnings.push({
      type: 'compatibility',
      message: 'Table-based layouts are recommended for better email client compatibility',
      severity: 'warning',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  }
}

/**
 * Validate links in HTML
 */
export function validateLinks(html: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []

  // Extract all links
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  const links: string[] = []
  let match

  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[1])
  }

  // Validate each link
  links.forEach((link, index) => {
    try {
      // Check for empty or placeholder links
      if (!link || link === '#' || link === 'javascript:void(0)') {
        warnings.push({
          type: 'link',
          message: `Link ${index + 1} appears to be a placeholder`,
          severity: 'warning',
          element: `link-${index + 1}`,
        })
      }

      // Check for valid URL format
      if (link && !link.startsWith('#')) {
        new URL(link.startsWith('http') ? link : `https://${link}`)
      }

      // Check for long URLs (email client issues)
      if (link.length > 200) {
        warnings.push({
          type: 'link',
          message: `Link ${index + 1} is very long and may be truncated in some email clients`,
          severity: 'warning',
          element: `link-${index + 1}`,
        })
      }
    } catch (error) {
      errors.push({
        type: 'link',
        message: `Link ${index + 1} appears to be invalid: ${link}`,
        severity: 'error',
        element: `link-${index + 1}`,
      })
    }
  })

  // Check for links without text
  const emptyLinkRegex = /<a[^>]+href=["'][^"']+["'][^>]*>\s*<\/a>/gi
  if (emptyLinkRegex.test(html)) {
    warnings.push({
      type: 'link',
      message: 'Some links appear to be empty',
      severity: 'warning',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  }
}

/**
 * Validate images in HTML
 */
export function validateImages(html: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []

  // Extract all images
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const images: Array<{ src: string; alt?: string }> = []
  let match

  while ((match = imgRegex.exec(html)) !== null) {
    const altMatch = match[0].match(/alt=["']([^"']*)["']/i)
    images.push({
      src: match[1],
      alt: altMatch ? altMatch[1] : undefined,
    })
  }

  // Validate each image
  images.forEach((img, index) => {
    // Check for alt text (accessibility)
    if (!img.alt || img.alt.trim().length === 0) {
      warnings.push({
        type: 'accessibility',
        message: `Image ${index + 1} is missing alt text`,
        severity: 'warning',
        element: `image-${index + 1}`,
      })
    }

    // Check for data URIs (may cause issues)
    if (img.src.startsWith('data:')) {
      info.push({
        type: 'image',
        message: `Image ${index + 1} uses data URI - consider using hosted images for better compatibility`,
        severity: 'info',
        element: `image-${index + 1}`,
      })
    }

    // Check for absolute URLs (recommended)
    if (!img.src.startsWith('http://') && !img.src.startsWith('https://') && !img.src.startsWith('data:')) {
      warnings.push({
        type: 'image',
        message: `Image ${index + 1} should use absolute URLs for better email client compatibility`,
        severity: 'warning',
        element: `image-${index + 1}`,
      })
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  }
}

/**
 * Comprehensive email validation
 */
export function validateEmail(html: string): ValidationResult {
  const htmlValidation = validateHTML(html)
  const linkValidation = validateLinks(html)
  const imageValidation = validateImages(html)

  const allErrors = [
    ...htmlValidation.errors,
    ...linkValidation.errors,
    ...imageValidation.errors,
  ]

  const allWarnings = [
    ...htmlValidation.warnings,
    ...linkValidation.warnings,
    ...imageValidation.warnings,
  ]

  const allInfo = [
    ...htmlValidation.info,
    ...linkValidation.info,
    ...imageValidation.info,
  ]

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    info: allInfo,
  }
}

