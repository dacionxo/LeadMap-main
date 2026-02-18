/**
 * Format a date as a human-readable relative time (e.g. "2 min ago", "1 hour ago")
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 120) return '1 min ago'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 7200) return '1 hour ago'
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 172800) return 'Yesterday'
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  if (seconds < 1209600) return '1 week ago'
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`
  if (seconds < 5184000) return '1 month ago'
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`
  if (seconds < 63072000) return '1 year ago'
  return `${Math.floor(seconds / 31536000)} years ago`
}
