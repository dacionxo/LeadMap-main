-- Document the Unibox deletion flow: Inbox -> Recycling Bin -> Trash
-- Flow: Email Inbox (trashed_at NULL) -> Recycling Bin (trashed_at set) -> Trash (DELETE)

-- Update column comment to reflect Recycling Bin semantics
COMMENT ON COLUMN email_threads.trashed_at IS 'Recycling Bin: When set, thread is in Recycling Bin (recoverable). Flow: Inbox -> Recycling Bin -> Trash (DELETE). Restore by setting to NULL.';
