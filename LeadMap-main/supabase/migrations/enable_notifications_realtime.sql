-- ============================================================================
-- Enable Supabase Realtime for notifications table
-- ============================================================================
-- So the notifications dropdown can subscribe to postgres_changes and update
-- automatically when new notifications are inserted or updated (e.g. read).
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
