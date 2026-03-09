-- Unibox thread search: fast DB-backed search for /dashboard/unibox
-- Adds generated tsvector columns + GIN indexes, and an RPC to page thread IDs.
--
-- Notes:
-- - Uses websearch_to_tsquery for natural search syntax.
-- - Falls back to ILIKE for participant email/name matching.
-- - Designed to keep API handler logic simple and efficient.

-- Ensure required extension exists (Supabase typically has it enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Search vectors + indexes
-- ---------------------------------------------------------------------------

ALTER TABLE email_threads
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(subject, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_email_threads_search_vector
  ON email_threads USING GIN (search_vector);

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(subject, '') || ' ' ||
      coalesce(snippet, '') || ' ' ||
      coalesce(body_plain, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_email_messages_search_vector
  ON email_messages USING GIN (search_vector);

-- Helpful for participant ILIKE matching (fast-ish for email substring)
CREATE INDEX IF NOT EXISTS idx_email_participants_email_trgm
  ON email_participants USING GIN (email gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- RPC: thread id search with pagination + total
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.unibox_search_thread_ids(
  p_user_id uuid,
  p_mailbox_id uuid DEFAULT NULL,
  p_folder text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_starred boolean DEFAULT NULL,
  p_archived boolean DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_text text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_from text DEFAULT NULL,
  p_to text DEFAULT NULL,
  p_has_attachment boolean DEFAULT NULL,
  p_is_read boolean DEFAULT NULL,
  p_is_unread boolean DEFAULT NULL,
  p_after timestamptz DEFAULT NULL,
  p_before timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(thread_id uuid, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base_threads AS (
    SELECT t.id, t.last_message_at
    FROM email_threads t
    WHERE t.user_id = p_user_id
      AND (p_mailbox_id IS NULL OR t.mailbox_id = p_mailbox_id)
      AND (p_status IS NULL OR t.status = p_status)
      AND (p_starred IS NULL OR t.starred = p_starred)
      AND (p_archived IS NULL OR t.archived = p_archived)
      AND (p_campaign_id IS NULL OR t.campaign_id = p_campaign_id)
      AND (p_contact_id IS NULL OR t.contact_id = p_contact_id)
      AND (p_after IS NULL OR t.last_message_at >= p_after)
      AND (p_before IS NULL OR t.last_message_at <= p_before)
      -- Folder semantics (matches /api/unibox/threads behavior)
      AND (
        p_folder IS NULL OR
        (
          CASE
            WHEN p_folder IN ('trash', 'recycling_bin') THEN t.trashed_at IS NOT NULL
            WHEN p_folder = 'sent' THEN t.trashed_at IS NULL AND t.last_outbound_at IS NOT NULL
            WHEN p_folder = 'archived' THEN t.trashed_at IS NULL AND t.archived IS TRUE
            WHEN p_folder = 'starred' THEN t.trashed_at IS NULL AND t.starred IS TRUE
            WHEN p_folder = 'inbox' THEN t.trashed_at IS NULL AND t.archived IS FALSE AND t.last_inbound_at IS NOT NULL
            ELSE t.trashed_at IS NULL
          END
        )
      )
  ),
  matching AS (
    SELECT DISTINCT bt.id AS thread_id, bt.last_message_at
    FROM base_threads bt
    LEFT JOIN email_threads t ON t.id = bt.id
    LEFT JOIN email_messages m ON m.thread_id = bt.id
    LEFT JOIN email_participants ep ON ep.message_id = m.id
    WHERE
      -- subject:... filter (fast on email_threads)
      (p_subject IS NULL OR p_subject = '' OR coalesce(t.subject, '') ILIKE ('%' || p_subject || '%'))
      -- from:... filter (participants)
      AND (
        p_from IS NULL OR p_from = '' OR
        EXISTS (
          SELECT 1
          FROM email_messages m2
          JOIN email_participants ep2 ON ep2.message_id = m2.id
          WHERE m2.thread_id = bt.id
            AND ep2.type = 'from'
            AND (ep2.email ILIKE ('%' || p_from || '%') OR coalesce(ep2.name, '') ILIKE ('%' || p_from || '%'))
        )
      )
      -- to:... filter (participants)
      AND (
        p_to IS NULL OR p_to = '' OR
        EXISTS (
          SELECT 1
          FROM email_messages m3
          JOIN email_participants ep3 ON ep3.message_id = m3.id
          WHERE m3.thread_id = bt.id
            AND ep3.type IN ('to','cc','bcc')
            AND (ep3.email ILIKE ('%' || p_to || '%') OR coalesce(ep3.name, '') ILIKE ('%' || p_to || '%'))
        )
      )
      -- has:attachment filter
      AND (
        p_has_attachment IS NULL OR
        (
          p_has_attachment IS TRUE AND EXISTS (
            SELECT 1
            FROM email_messages ma
            JOIN email_attachments a ON a.message_id = ma.id
            WHERE ma.thread_id = bt.id
          )
        ) OR (
          p_has_attachment IS FALSE AND NOT EXISTS (
            SELECT 1
            FROM email_messages mb
            JOIN email_attachments b ON b.message_id = mb.id
            WHERE mb.thread_id = bt.id
          )
        )
      )
      -- is:read / is:unread semantics over inbound messages
      AND (
        p_is_unread IS NULL OR
        (
          p_is_unread IS TRUE AND EXISTS (
            SELECT 1
            FROM email_messages mu
            WHERE mu.thread_id = bt.id
              AND mu.direction = 'inbound'
              AND mu.read = FALSE
          )
        ) OR (
          p_is_unread IS FALSE AND NOT EXISTS (
            SELECT 1
            FROM email_messages mu2
            WHERE mu2.thread_id = bt.id
              AND mu2.direction = 'inbound'
              AND mu2.read = FALSE
          )
        )
      )
      AND (
        p_is_read IS NULL OR
        (
          p_is_read IS TRUE AND NOT EXISTS (
            SELECT 1
            FROM email_messages mr
            WHERE mr.thread_id = bt.id
              AND mr.direction = 'inbound'
              AND mr.read = FALSE
          )
        ) OR (
          p_is_read IS FALSE AND EXISTS (
            SELECT 1
            FROM email_messages mr2
            WHERE mr2.thread_id = bt.id
              AND mr2.direction = 'inbound'
              AND mr2.read = FALSE
          )
        )
      )
      -- free-text search over subject/snippet/body (FTS) + participant email/name (ILIKE)
      AND (
        p_text IS NULL OR p_text = '' OR
        (
          t.search_vector @@ websearch_to_tsquery('english', p_text)
          OR m.search_vector @@ websearch_to_tsquery('english', p_text)
          OR coalesce(ep.email, '') ILIKE ('%' || p_text || '%')
          OR coalesce(ep.name, '') ILIKE ('%' || p_text || '%')
        )
      )
  )
  SELECT
    matching.thread_id,
    count(*) OVER() AS total_count
  FROM matching
  ORDER BY matching.last_message_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(p_offset, 0);
$$;

