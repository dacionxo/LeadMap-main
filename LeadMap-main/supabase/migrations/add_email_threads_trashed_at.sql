-- Add trashed_at column to email_threads for Trash folder
-- When set, thread appears in Trash; permanent delete removes row entirely

ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_email_threads_trashed_at ON email_threads(trashed_at) WHERE trashed_at IS NOT NULL;
COMMENT ON COLUMN email_threads.trashed_at IS 'When set, thread is in Trash; NULL means not trashed';
