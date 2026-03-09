/**
 * Supported image MIME types and extensions for email attachments
 * Used when sending and receiving email attachments
 */

/** MIME types for supported image formats (JPG/JPEG, PNG, GIF, SVG, WebP, AVIF, TIFF, HEIC) */
export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/jpg', // Some clients use this
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/heic',
  'image/heif',
]

/** Map of extension -> MIME type for supported image formats */
export const IMAGE_EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',
}

/** Accept attribute value for file inputs (image attachments) */
export const IMAGE_ACCEPT_ATTRIBUTE =
  'image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp,image/avif,image/tiff,image/heic,image/heif,.jpg,.jpeg,.png,.gif,.svg,.webp,.avif,.tiff,.tif,.heic,.heif'

/**
 * Check if a MIME type is an allowed image type for email attachments
 */
export function isAllowedImageMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().trim()
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(normalized)
}

/**
 * Check if a filename extension is an allowed image type
 */
export function isAllowedImageExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? ext in IMAGE_EXTENSION_TO_MIME : false
}
