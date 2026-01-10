/**
 * Queue Job Processor
 * Background job processor for publishing posts
 * Handles retries, rate limiting, and error recovery
 * 
 * Phase 7: Integrated with observability (logging, metrics, audit)
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton'
import { publisher, PublishResult } from './publisher'
import { createLogger, logQueueJob } from '@/lib/postiz/observability/logging'
import { postizMetrics } from '@/lib/postiz/observability/metrics'
import { postizAudit } from '@/lib/postiz/security/audit'

export interface QueueJob {
  id: string
  workspace_id: string
  post_id: string
  post_target_id: string
  scheduled_at: string
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'retrying' | 'canceled'
  attempt_number: number
  max_attempts: number
  next_retry_at?: string
  error_message?: string
  error_code?: string
  created_at: string
}

export interface ProcessingResult {
  success: boolean
  retry?: boolean
  delay?: number // Delay in milliseconds for next retry
  error?: string
  publishResult?: PublishResult
}

/**
 * Queue processor that handles background publishing jobs
 */
export class QueueProcessor {
  private supabase = getServiceRoleClient()

  /**
   * Process a single queue job
   */
  async processJob(jobId: string, correlationId?: string): Promise<ProcessingResult> {
    const logger = createLogger(correlationId, { queueJobId: jobId })
    const startTime = Date.now()

    try {
      logger.info('Processing queue job')

      // Get job details
      const { data: job, error } = await this.supabase
        .from('queue_jobs')
        .select(`
          *,
          post_targets (
            id,
            social_account_id,
            content_override,
            title_override,
            description_override,
            media_override,
            settings_override,
            posts (
              id,
              content,
              primary_media_id,
              media_ids,
              settings,
              workspace_id
            )
          )
        `)
        .eq('id', jobId)
        .eq('status', 'pending')
        .single()

      if (error || !job) {
        logger.error('Job not found or not in pending status', error as Error)
        return {
          success: false,
          error: `Job not found or not in pending status: ${error?.message}`,
        }
      }

      logger.debug('Job found', {
        workspaceId: job.workspace_id,
        postTargetId: job.post_target_id,
        attemptNumber: job.attempt_number,
      })

      // Mark job as running
      await this.updateJobStatus(jobId, 'running')
      logQueueJob(logger, 'started', jobId, { attemptNumber: job.attempt_number })

      // Get social account details
      const { data: socialAccount } = await this.supabase
        .from('social_accounts')
        .select('id, provider_type, user_id')
        .eq('id', job.post_targets.social_account_id)
        .single()

      if (!socialAccount) {
        logger.error('Social account not found', undefined, {
          socialAccountId: job.post_targets.social_account_id,
        })
        return await this.failJob(jobId, 'Social account not found', logger)
      }

      logger.debug('Social account found', {
        providerType: socialAccount.provider_type,
        accountId: socialAccount.id,
      })

      // Prepare content for publishing
      const post = job.post_targets.posts
      const content = {
        message: job.post_targets.content_override || post.content,
        media: await this.prepareMedia(
          post.primary_media_id,
          post.media_ids || [],
          job.post_targets.media_override
        ),
        settings: {
          ...JSON.parse(post.settings || '{}'),
          ...JSON.parse(job.post_targets.settings_override || '{}'),
        },
      }

      // Publish to platform
      const publishStartTime = Date.now()
      logger.info('Publishing post', {
        providerType: socialAccount.provider_type,
        accountId: socialAccount.id,
      })

      const publishResult = await publisher.publish(
        {
          socialAccountId: socialAccount.id,
          userId: socialAccount.user_id,
          content,
          platform: socialAccount.provider_type,
        },
        logger.getCorrelationId()
      )

      const publishDuration = Date.now() - publishStartTime

      // Record metrics
      await postizMetrics.recordMetric('post_publish_attempt', 1, {
        workspaceId: job.workspace_id,
        providerType: socialAccount.provider_type,
        success: publishResult.success ? 'true' : 'false',
      })

      await postizMetrics.recordMetric('post_publish_latency', publishDuration, {
        workspaceId: job.workspace_id,
        providerType: socialAccount.provider_type,
      })

      if (publishResult.success) {
        logger.info('Post published successfully', {
          postId: publishResult.postId,
          releaseURL: publishResult.releaseURL,
          durationMs: publishDuration,
        })

        // Update job as completed
        await this.completeJob(jobId, publishResult, publishDuration, logger)
        return {
          success: true,
          publishResult,
        }
      } else {
        logger.warn('Post publish failed', undefined, {
          error: publishResult.error,
          attemptNumber: job.attempt_number,
          durationMs: publishDuration,
        })

        // Handle failure with retry logic
        return await this.handleFailure(jobId, publishResult.error || 'Unknown error', logger)
      }
    } catch (error: any) {
      logger.error('Queue job processing error', error, {
        jobId,
      })
      return await this.failJob(jobId, `Processing error: ${error.message}`, logger)
    }
  }

  /**
   * Get next pending job to process
   */
  async getNextJob(): Promise<QueueJob | null> {
    const { data: job, error } = await this.supabase
      .from('queue_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[QueueProcessor.getNextJob] Error:', error)
      return null
    }

    return job
  }

  /**
   * Get jobs ready for retry
   */
  async getRetryJobs(): Promise<QueueJob[]> {
    const { data: jobs, error } = await this.supabase
      .from('queue_jobs')
      .select('*')
      .eq('status', 'retrying')
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(10) // Process up to 10 retry jobs at once

    if (error) {
      console.error('[QueueProcessor.getRetryJobs] Error:', error)
      return []
    }

    return jobs || []
  }

  /**
   * Prepare media for publishing
   */
  private async prepareMedia(
    primaryMediaId?: string,
    mediaIds?: string[],
    overrideMedia?: string[]
  ): Promise<Array<{ type: 'image' | 'video'; path: string; alt?: string }> | undefined> {
    const finalMediaIds = overrideMedia || [primaryMediaId, ...(mediaIds || [])].filter(Boolean)

    if (finalMediaIds.length === 0) {
      return undefined
    }

    // Get media details from database
    const { data: mediaAssets } = await this.supabase
      .from('media_assets')
      .select('id, type, storage_path, alt_text')
      .in('id', finalMediaIds)

    if (!mediaAssets) {
      return undefined
    }

    return mediaAssets.map((asset) => ({
      type: asset.type as 'image' | 'video',
      path: asset.storage_path,
      alt: asset.alt_text || undefined,
    }))
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: string, updates: any = {}): Promise<void> {
    const { error } = await this.supabase
      .from('queue_jobs')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...updates,
      })
      .eq('id', jobId)

    if (error) {
      console.error('[QueueProcessor.updateJobStatus] Error:', error)
    }
  }

  /**
   * Mark job as completed
   */
  private async completeJob(
    jobId: string,
    publishResult: PublishResult,
    durationMs: number,
    logger?: ReturnType<typeof createLogger>
  ): Promise<void> {
    await this.updateJobStatus(jobId, 'completed', {
      completed_at: new Date().toISOString(),
      execution_duration_ms: durationMs,
      provider_response: publishResult.platformResponse,
    })

    if (logger) {
      logQueueJob(logger, 'completed', jobId, {
        durationMs,
        postId: publishResult.postId,
      })
    }

    // Update post target with publish results
    const { data: job } = await this.supabase
      .from('queue_jobs')
      .select('post_target_id')
      .eq('id', jobId)
      .single()

    if (job) {
      await this.supabase
        .from('post_targets')
        .update({
          publish_status: 'published',
          published_at: new Date().toISOString(),
          published_post_id: publishResult.postId,
          published_post_url: publishResult.releaseURL,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.post_target_id)
    }

    // Log analytics event
    await this.logAnalyticsEvent(jobId, 'post_published', {
      post_id: publishResult.postId,
      platform_response: publishResult.platformResponse,
    })
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleFailure(
    jobId: string,
    error: string,
    logger?: ReturnType<typeof createLogger>
  ): Promise<ProcessingResult> {
    const { data: job } = await this.supabase
      .from('queue_jobs')
      .select('attempt_number, max_attempts, status')
      .eq('id', jobId)
      .single()

    if (!job) {
      return { success: false, error: 'Job not found' }
    }

    const currentAttempt = job.attempt_number || 0

    if (currentAttempt < (job.max_attempts || 3)) {
      // Schedule retry with exponential backoff
      const delayMs = Math.pow(2, currentAttempt) * 60000 // 1min, 2min, 4min...
      const nextRetryAt = new Date(Date.now() + delayMs)

      await this.updateJobStatus(jobId, 'retrying', {
        attempt_number: currentAttempt + 1,
        next_retry_at: nextRetryAt.toISOString(),
        error_message: error,
      })

      if (logger) {
        logger.warn('Job scheduled for retry', undefined, {
          attemptNumber: currentAttempt + 1,
          nextRetryAt: nextRetryAt.toISOString(),
          delayMs,
        })
        logQueueJob(logger, 'retrying', jobId, {
          attemptNumber: currentAttempt + 1,
          nextRetryAt: nextRetryAt.toISOString(),
        })
      }

      // Record retry metric
      await postizMetrics.recordMetric('queue_job_retry', 1, {
        jobId,
        attemptNumber: currentAttempt + 1,
      })

      return {
        success: false,
        retry: true,
        delay: delayMs,
        error,
      }
    } else {
      // Max retries exceeded
      if (logger) {
        logger.error('Max retries exceeded', undefined, {
          attemptNumber: currentAttempt,
          maxAttempts: job.max_attempts || 3,
        })
      }
      return await this.failJob(jobId, error, logger)
    }
  }

  /**
   * Mark job as permanently failed
   */
  private async failJob(
    jobId: string,
    error: string,
    logger?: ReturnType<typeof createLogger>
  ): Promise<ProcessingResult> {
    const errorCode = this.extractErrorCode(error)

    await this.updateJobStatus(jobId, 'failed', {
      error_message: error,
      error_code: errorCode,
      completed_at: new Date().toISOString(),
    })

    // Update post target status
    const { data: job } = await this.supabase
      .from('queue_jobs')
      .select('post_target_id, workspace_id')
      .eq('id', jobId)
      .single()

    if (job) {
      await this.supabase
        .from('post_targets')
        .update({
          publish_status: 'failed',
          publish_error: error,
          publish_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.post_target_id)

      // Record failure metric
      await postizMetrics.recordMetric('queue_job_failed', 1, {
        jobId,
        workspaceId: job.workspace_id,
        errorCode,
      })
    }

    if (logger) {
      logger.error('Job failed permanently', undefined, {
        error,
        errorCode,
      })
      logQueueJob(logger, 'failed', jobId, {
        error,
        errorCode,
      })
    }

    // Log analytics event
    await this.logAnalyticsEvent(jobId, 'post_publish_failed', {
      error,
      error_code: errorCode,
    })

    return {
      success: false,
      error,
    }
  }

  /**
   * Extract error code from error message
   */
  private extractErrorCode(error: string): string {
    // Extract common error codes from error messages
    if (error.includes('401') || error.includes('Unauthorized')) return 'AUTH_ERROR'
    if (error.includes('403') || error.includes('Forbidden')) return 'PERMISSION_ERROR'
    if (error.includes('404') || error.includes('Not Found')) return 'NOT_FOUND'
    if (error.includes('429') || error.includes('Rate Limit')) return 'RATE_LIMIT'
    if (error.includes('500') || error.includes('Internal Server')) return 'SERVER_ERROR'
    if (error.includes('Network') || error.includes('timeout')) return 'NETWORK_ERROR'
    if (error.includes('Invalid') || error.includes('invalid')) return 'VALIDATION_ERROR'
    if (error.includes('expired') || error.includes('Expired')) return 'TOKEN_EXPIRED'
    return 'UNKNOWN_ERROR'
  }

  /**
   * Log analytics event
   */
  private async logAnalyticsEvent(jobId: string, eventType: string, data: any): Promise<void> {
    const { data: job } = await this.supabase
      .from('queue_jobs')
      .select(`
        workspace_id,
        post_target_id,
        post_targets (
          social_account_id,
          posts (id)
        )
      `)
      .eq('id', jobId)
      .single()

    if (job) {
      await this.supabase
        .from('analytics_events')
        .insert({
          workspace_id: job.workspace_id,
          post_id: job.post_targets?.posts?.id,
          post_target_id: job.post_target_id,
          social_account_id: job.post_targets?.social_account_id,
          event_type: eventType as any,
          event_value: 1,
          event_data: data,
          event_timestamp: new Date().toISOString(),
        })
    }
  }
}

// Export singleton instance
export const queueProcessor = new QueueProcessor()
