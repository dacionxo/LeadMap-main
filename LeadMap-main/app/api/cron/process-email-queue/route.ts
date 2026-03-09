/**
 * Email Queue Processor Cron Job
 * 
 * Processes queued emails in the background, handling:
 * - Email queue fetching and filtering
 * - Mailbox validation and rate limiting
 * - Email sending via appropriate providers
 * - Retry logic with exponential backoff
 * - Comprehensive error handling and logging
 * 
 * Runs every minute
 * 
 * @module app/api/cron/process-email-queue
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyCronRequestOrError } from '@/lib/cron/auth'
import { handleCronError, DatabaseError, ValidationError } from '@/lib/cron/errors'
import { createSuccessResponse, createErrorResponse, createNoDataResponse, createBatchResponse } from '@/lib/cron/responses'
import { getCronSupabaseClient, executeUpdateOperation, executeSelectOperation, executeInsertOperation } from '@/lib/cron/database'
import { sendViaMailbox, checkMailboxLimits } from '@/lib/email/sendViaMailbox'
import { recordSentEmailToUnibox } from '@/lib/email/unibox/record-sent-email'
import type { Mailbox, EmailPayload, SendResult } from '@/lib/email/types'
import type { CronJobResult, BatchProcessingStats } from '@/lib/types/cron'
import { dispatchEmailQueueBatch, type EmailQueueItem as SymphonyEmailQueueItem } from '@/lib/symphony/integration/email-queue'
import { shouldUseSymphonyForEmailQueue } from '@/lib/symphony/utils/feature-flags'

export const runtime = 'nodejs'

/**
 * Email queue item structure from database
 */
interface EmailQueueItem {
  id: string
  user_id: string
  mailbox_id: string
  to_email: string
  subject: string
  html: string
  from_name?: string | null
  from_email?: string | null
  type?: string | null
  campaign_id?: string | null
  campaign_recipient_id?: string | null
  status: 'queued' | 'processing' | 'sent' | 'failed'
  priority: number
  scheduled_at?: string | null
  retry_count: number
  max_retries: number
  last_error?: string | null
  created_at: string
  processed_at?: string | null
}

/**
 * Processing result for individual email
 */
interface EmailProcessingResult extends CronJobResult {
  email_id: string
  provider_message_id?: string
  retry_count?: number
  reason?: string
}

/**
 * Response structure for process email queue
 */
interface ProcessEmailQueueResponse {
  success: boolean
  timestamp: string
  processed: number
  successful: number
  failed: number
  skipped: number
  results: EmailProcessingResult[]
  stats?: BatchProcessingStats
}

/** Normalize any datetime-like value to ISO string; null/undefined pass through */
function toIsoString(v: unknown): string | undefined {
  if (v == null || v === undefined) return undefined
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number') return new Date(v).toISOString()
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toISOString()
  }
  if (typeof v === 'object' && typeof (v as Date).toISOString === 'function') return (v as Date).toISOString()
  return undefined
}

/** Optional datetime: accepts any format, normalizes to ISO string */
const optionalDatetimeSchema = z.preprocess(toIsoString, z.string().optional())

/** Required datetime: accepts any format, normalizes to ISO string */
const requiredDatetimeSchema = z.preprocess((v) => {
  const s = toIsoString(v)
  return s ?? ''
}, z.string().min(1))

/** Lenient email: accepts typical email format (local@domain) without strict RFC validation */
const emailSchema = z
  .string()
  .min(1)
  .refine((s) => {
    const t = s.trim()
    return t.includes('@') && t.length >= 3
  }, { message: 'Invalid email format' })

/** Optional email: lenient, allows null/undefined/empty; validates format when present */
const optionalEmailSchema = z.preprocess(
  (v) => (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) ? undefined : (typeof v === 'string' ? v.trim() : v),
  z.union([
    emailSchema,
    z.undefined(),
  ])
)

/**
 * Zod schema for email queue item validation (lenient for DB format variations)
 */
const emailQueueItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mailbox_id: z.string().uuid(),
  to_email: emailSchema,
  subject: z.string(),
  html: z.string(),
  from_name: z.string().nullable().optional(),
  from_email: optionalEmailSchema,
  type: z.string().nullable().optional(),
  campaign_id: z.union([z.string().uuid(), z.null(), z.undefined()]).optional(),
  campaign_recipient_id: z.union([z.string().uuid(), z.null(), z.undefined()]).optional(),
  status: z.enum(['queued', 'processing', 'sent', 'failed']),
  priority: z.union([z.number(), z.string()]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)).pipe(z.number().int().nonnegative()),
  scheduled_at: optionalDatetimeSchema,
  retry_count: z.union([z.number(), z.string()]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)).pipe(z.number().int().nonnegative()),
  max_retries: z.union([z.number(), z.string()]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)).pipe(z.number().int().nonnegative()),
  last_error: z.string().nullable().optional(),
  created_at: requiredDatetimeSchema,
  processed_at: optionalDatetimeSchema,
})

/**
 * Validates and parses email queue item
 * 
 * @param item - Raw item from database
 * @returns Validated email queue item
 * @throws ValidationError if validation fails
 */
function validateEmailQueueItem(item: unknown): EmailQueueItem {
  const result = emailQueueItemSchema.safeParse(item)
  
  if (!result.success) {
    throw new ValidationError(
      'Invalid email queue item structure',
      result.error.issues
    )
  }
  
  return result.data
}

/**
 * Fetches queued emails ready for processing
 * 
 * @param supabase - Supabase client
 * @param now - Current timestamp
 * @param batchSize - Maximum number of emails to process
 * @returns Array of validated email queue items
 */
async function fetchQueuedEmails(
  supabase: ReturnType<typeof getCronSupabaseClient>,
  now: Date,
  batchSize: number
): Promise<EmailQueueItem[]> {
  const result = await executeSelectOperation<EmailQueueItem>(
    supabase,
    'email_queue',
    '*',
    (query) => {
      return (query as any)
        .eq('status', 'queued')
        .or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(batchSize)
    },
    {
      operation: 'fetch_queued_emails',
    }
  )

  if (!result.success) {
    throw new DatabaseError(
      'Failed to fetch queued emails',
      result.error
    )
  }

  if (!result.data) {
    return []
  }

  // Normalize to array (executeSelectOperation can return T or T[])
  const dataArray = Array.isArray(result.data) ? result.data : [result.data]
  
  if (dataArray.length === 0) {
    return []
  }

  // Validate all items
  return dataArray.map(validateEmailQueueItem)
}

/**
 * Fetches mailbox with validation
 * 
 * @param supabase - Supabase client
 * @param mailboxId - Mailbox ID
 * @param userId - User ID for multi-tenant isolation
 * @returns Validated mailbox
 * @throws DatabaseError if mailbox not found
 */
async function fetchMailbox(
  supabase: ReturnType<typeof getCronSupabaseClient>,
  mailboxId: string,
  userId: string
): Promise<Mailbox> {
  const result = await executeSelectOperation<Mailbox>(
    supabase,
    'mailboxes',
    '*',
    (query) => {
      return (query as any)
        .eq('id', mailboxId)
        .eq('user_id', userId)
        .single()
    },
    {
      operation: 'fetch_mailbox',
      mailboxId,
      userId,
    }
  )

  if (!result.success || !result.data) {
    throw new DatabaseError(
      'Mailbox not found or access denied',
      result.error
    )
  }

  // Since we use .single(), result.data should be a single Mailbox object
  // But handle both cases for type safety
  if (Array.isArray(result.data)) {
    if (result.data.length === 0) {
      throw new DatabaseError(
        'Mailbox not found or access denied',
        result.error
      )
    }
    return result.data[0]
  }

  return result.data
}

/**
 * Calculates recent email counts for rate limiting
 * 
 * @param supabase - Supabase client
 * @param mailboxId - Mailbox ID
 * @param oneHourAgo - Timestamp for one hour ago
 * @param oneDayAgo - Timestamp for one day ago
 * @returns Object with hourly and daily counts
 */
async function calculateRecentEmailCounts(
  supabase: ReturnType<typeof getCronSupabaseClient>,
  mailboxId: string,
  oneHourAgo: Date,
  oneDayAgo: Date
): Promise<{ hourly: number; daily: number }> {
  const result = await executeSelectOperation<{ sent_at: string }>(
    supabase,
    'emails',
    'sent_at',
    (query) => {
      return (query as any)
        .eq('mailbox_id', mailboxId)
        .eq('status', 'sent')
        .not('sent_at', 'is', null)
    },
    {
      operation: 'calculate_recent_counts',
      mailboxId,
    }
  )

  if (!result.success || !result.data) {
    return { hourly: 0, daily: 0 }
  }

  // Normalize to array (executeSelectOperation can return T or T[])
  const dataArray = Array.isArray(result.data) ? result.data : [result.data]

  const hourlyCount = dataArray.filter((e) => {
    if (!e.sent_at) return false
    const sentAt = new Date(e.sent_at)
    return sentAt >= oneHourAgo
  }).length

  const dailyCount = dataArray.filter((e) => {
    if (!e.sent_at) return false
    const sentAt = new Date(e.sent_at)
    return sentAt >= oneDayAgo
  }).length

  return { hourly: hourlyCount, daily: dailyCount }
}

/**
 * Atomically claim a queued item (queued -> processing). Prevents duplicate sends when
 * multiple cron instances fetch the same items. Returns true if claimed, false if
 * another instance already claimed it.
 */
async function claimQueuedItem(
  supabase: ReturnType<typeof getCronSupabaseClient>,
  emailId: string
): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from('email_queue')
    .update({ status: 'processing' })
    .eq('id', emailId)
    .eq('status', 'queued')
    .select('id')
    .single()

  return !error && !!data
}

/**
 * Updates email queue status
 * 
 * @param supabase - Supabase client
 * @param emailId - Email queue item ID
 * @param updateData - Data to update
 */
async function updateEmailQueueStatus(
  supabase: ReturnType<typeof getCronSupabaseClient>,
  emailId: string,
  updateData: Record<string, unknown>
): Promise<void> {
  const result = await executeUpdateOperation(
    supabase,
    'email_queue',
    updateData,
    (query) => (query as any).eq('id', emailId),
    {
      operation: 'update_queue_status',
      emailId,
    }
  )

  if (!result.success) {
    throw new DatabaseError(
      'Failed to update email queue status',
      result.error
    )
  }
}

/**
 * Creates email record in emails table
 * 
 * @param supabase - Supabase client
 * @param emailData - Email data to insert
 */
async function createEmailRecord(
  supabase: ReturnType<typeof getCronSupabaseClient>,
  emailData: {
    user_id: string
    mailbox_id: string
    to_email: string
    subject: string
    html: string
    status: 'sent'
    sent_at: string
    provider_message_id?: string
    direction: 'sent'
    type?: string | null
    campaign_id?: string | null
    campaign_recipient_id?: string | null
  }
): Promise<void> {
  const result = await executeInsertOperation(
    supabase,
    'emails',
    emailData,
    {
      operation: 'create_email_record',
    }
  )

  if (!result.success) {
    throw new DatabaseError(
      'Failed to create email record',
      result.error
    )
  }
}

/**
 * Processes a single email from the queue
 * 
 * @param email - Email queue item to process
 * @param supabase - Supabase client
 * @param now - Current timestamp
 * @returns Processing result
 */
async function processEmail(
  email: EmailQueueItem,
  supabase: ReturnType<typeof getCronSupabaseClient>,
  now: Date
): Promise<EmailProcessingResult> {
  const emailId = email.id

  try {
    // Atomically claim (queued -> processing) to prevent duplicate sends
    const claimed = await claimQueuedItem(supabase, emailId)
    if (!claimed) {
      return {
        email_id: emailId,
        status: 'skipped',
        reason: 'Already claimed by another processor',
      }
    }

    // Fetch and validate mailbox
    let mailbox: Mailbox
    try {
      mailbox = await fetchMailbox(supabase, email.mailbox_id, email.user_id)
    } catch (error) {
      const retryCount = email.retry_count + 1
      await updateEmailQueueStatus(supabase, emailId, {
        status: 'failed',
        last_error: 'Mailbox not found',
        retry_count: retryCount,
      })

      return {
        email_id: emailId,
        status: 'failed',
        error: 'Mailbox not found',
        retry_count: retryCount,
      }
    }

    // Check if mailbox is active
    if (!mailbox.active) {
      const retryCount = email.retry_count + 1
      await updateEmailQueueStatus(supabase, emailId, {
        status: 'failed',
        last_error: 'Mailbox is not active',
        retry_count: retryCount,
      })

      return {
        email_id: emailId,
        status: 'failed',
        error: 'Mailbox is not active',
        retry_count: retryCount,
      }
    }

    // Check rate limits
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { hourly, daily } = await calculateRecentEmailCounts(
      supabase,
      mailbox.id,
      oneHourAgo,
      oneDayAgo
    )

    const limitCheck = await checkMailboxLimits(
      mailbox,
      { hourly, daily },
      supabase
    )

    if (!limitCheck.allowed) {
      // Rate limited - keep in queue, don't increment retry count
      await updateEmailQueueStatus(supabase, emailId, {
        status: 'queued',
      })

      return {
        email_id: emailId,
        status: 'skipped',
        reason: limitCheck.reason || 'Rate limit exceeded',
      }
    }

    // Prepare email payload
    const emailPayload: EmailPayload = {
      to: email.to_email,
      subject: email.subject,
      html: email.html,
      fromName: email.from_name || undefined,
      fromEmail: email.from_email || undefined,
    }

    // Send email
    const sendResult: SendResult = await sendViaMailbox(
      mailbox,
      emailPayload,
      supabase
    )

    if (sendResult.success) {
      // Create email record
      await createEmailRecord(supabase, {
        user_id: email.user_id,
        mailbox_id: email.mailbox_id,
        to_email: email.to_email,
        subject: email.subject,
        html: email.html,
        status: 'sent',
        sent_at: now.toISOString(),
        provider_message_id: sendResult.providerMessageId,
        direction: 'sent',
        type: email.type || null,
        campaign_id: email.campaign_id || null,
        campaign_recipient_id: email.campaign_recipient_id || null,
      })

      // Record to Unibox so sent email appears in Sent tab
      const fromEmail = email.from_email || mailbox.from_email || mailbox.email
      const fromName = email.from_name || mailbox.from_name || mailbox.display_name
      await recordSentEmailToUnibox({
        supabase,
        userId: email.user_id,
        mailboxId: email.mailbox_id,
        subject: email.subject,
        html: email.html,
        toEmail: email.to_email,
        fromEmail,
        fromName,
        providerMessageId: sendResult.providerMessageId,
        providerThreadId: `scheduled-${emailId}`,
        sentAt: now.toISOString(),
      })

      // Mark queue entry as sent
      await updateEmailQueueStatus(supabase, emailId, {
        status: 'sent',
        processed_at: now.toISOString(),
      })

      return {
        email_id: emailId,
        status: 'success',
        provider_message_id: sendResult.providerMessageId,
      }
    } else {
      // Send failed - retry if under max retries
      const retryCount = email.retry_count + 1
      const shouldRetry = retryCount < email.max_retries

      await updateEmailQueueStatus(supabase, emailId, {
        status: shouldRetry ? 'queued' : 'failed',
        last_error: sendResult.error || 'Failed to send email',
        retry_count: retryCount,
      })

      return {
        email_id: emailId,
        status: shouldRetry ? 'skipped' : 'failed',
        error: sendResult.error || 'Failed to send email',
        retry_count: retryCount,
        reason: shouldRetry ? 'Queued for retry' : 'Max retries exceeded',
      }
    }
  } catch (error) {
    // Handle processing errors
    const retryCount = email.retry_count + 1
    const shouldRetry = retryCount < email.max_retries
    const errorMessage =
      error instanceof Error ? error.message : 'Processing error'

    await updateEmailQueueStatus(supabase, emailId, {
      status: shouldRetry ? 'queued' : 'failed',
      last_error: errorMessage,
      retry_count: retryCount,
    })

    return {
      email_id: emailId,
      status: shouldRetry ? 'skipped' : 'failed',
      error: errorMessage,
      retry_count: retryCount,
      reason: shouldRetry ? 'Queued for retry after error' : 'Max retries exceeded',
    }
  }
}

/**
 * Main cron job handler
 * Processes queued emails in batches
 * 
 * @param request - Next.js request object
 * @returns NextResponse with processing results
 */
async function runCronJob(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authentication
    const authError = verifyCronRequestOrError(request)
    if (authError) {
      return authError
    }

    // Validate environment variables
    const batchSize = parseInt(
      process.env.EMAIL_QUEUE_BATCH_SIZE || '500',
      10
    )
    if (isNaN(batchSize) || batchSize <= 0) {
      throw new ValidationError(
        'Invalid EMAIL_QUEUE_BATCH_SIZE environment variable'
      )
    }

    // Get Supabase client
    const supabase = getCronSupabaseClient()
    const now = new Date()

    // Fetch queued emails
    const queuedEmails = await fetchQueuedEmails(supabase, now, batchSize)

    if (queuedEmails.length === 0) {
      return createNoDataResponse('No emails to process')
    }

    // Check if Symphony is enabled for email queue
    if (shouldUseSymphonyForEmailQueue()) {
      // Dispatch emails to Symphony Messenger
      const dispatchResult = await dispatchEmailQueueBatch(
        queuedEmails as SymphonyEmailQueueItem[]
      )

      const legacyItems = dispatchResult.legacyItems || []
      const legacyItemIds = new Set(legacyItems.map((e) => e.id))

      // Mark dispatched (non-legacy) items as processing immediately to prevent duplicate sends
      // when cron runs again before Symphony handler completes
      const dispatchedIds = queuedEmails
        .filter((e) => !legacyItemIds.has(e.id))
        .map((e) => e.id)
      for (const id of dispatchedIds) {
        await updateEmailQueueStatus(supabase, id, { status: 'processing' })
      }

      // Fallback: process any items that need legacy handling (useLegacy=true or dispatch error)
      const legacyResults: EmailProcessingResult[] = []

      for (const email of legacyItems) {
        const result = await processEmail(email as EmailQueueItem, supabase, now)
        legacyResults.push(result)
      }

      // Return response indicating Symphony processing + legacy fallback
      return createSuccessResponse({
        message: 'Emails dispatched to Symphony Messenger (with legacy fallback)',
        dispatched: dispatchResult.dispatched,
        legacy: legacyItems.length,
        legacyResults,
        errors: dispatchResult.errors,
        total: queuedEmails.length,
      })
    }

    // Legacy processing (existing logic)
    // Process each email
    const results: EmailProcessingResult[] = []
    const stats: BatchProcessingStats = {
      total: queuedEmails.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    }

    for (const email of queuedEmails) {
      const result = await processEmail(email, supabase, now)
      results.push(result)

      stats.processed++
      if (result.status === 'success') {
        stats.successful++
      } else if (result.status === 'failed') {
        stats.failed++
      } else {
        stats.skipped++
      }
    }

    stats.duration = Date.now() - startTime

    // Return batch response
    return createBatchResponse(stats, results, `Processed ${stats.processed} emails`)
  } catch (error) {
    return handleCronError(error, {
      cronJob: 'process-email-queue',
      operation: 'runCronJob',
    })
  }
}

/**
 * GET handler for Vercel Cron
 * 
 * @param request - Next.js request object
 * @returns NextResponse with processing results
 */
export async function GET(request: NextRequest) {
  return runCronJob(request)
}

/**
 * POST handler for manual triggers
 * 
 * @param request - Next.js request object
 * @returns NextResponse with processing results
 */
export async function POST(request: NextRequest) {
  return runCronJob(request)
}
