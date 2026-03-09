-- Optimize email_queue for 1,000+ users/emails scale
-- Supports: WHERE status='queued' AND (scheduled_at IS NULL OR scheduled_at <= now())
--           ORDER BY priority DESC, created_at ASC

CREATE INDEX IF NOT EXISTS idx_email_queue_queued_priority_created
  ON email_queue(priority DESC, created_at ASC)
  WHERE status = 'queued';
