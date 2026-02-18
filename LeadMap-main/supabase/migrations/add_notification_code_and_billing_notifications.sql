-- ============================================================================
-- Notifications: add notification_code and support billing/trial/sequence alerts
-- ============================================================================
-- Run after create_notifications_table.sql and notifications_event_triggers.sql
-- ============================================================================

-- Add notification_code for icon/UX (nullable for existing rows)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS notification_code TEXT;

-- Optional: index for filtering by code
CREATE INDEX IF NOT EXISTS idx_notifications_notification_code
  ON notifications(notification_code) WHERE notification_code IS NOT NULL;

COMMENT ON COLUMN notifications.notification_code IS 'Code for display: sequence_alert, trial_reminder, plan_overdue, account_overdue, autopay_failed, subscription_upgrade, etc.';

-- ============================================================================
-- Helper: insert notification with optional code (for triggers and cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_user_with_code(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_notification_code TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, notification_code)
  VALUES (p_user_id, p_type, COALESCE(p_title, ''), COALESCE(p_message, ''), p_link, p_notification_code);
END;
$$;

COMMENT ON FUNCTION public.notify_user_with_code IS 'Insert a notification with optional notification_code for billing/trial/sequence alerts.';

-- Keep existing notify_user writing NULL for notification_code so existing triggers still work
-- (notifications table now has notification_code column; existing notify_user only sets type, title, message, link)
