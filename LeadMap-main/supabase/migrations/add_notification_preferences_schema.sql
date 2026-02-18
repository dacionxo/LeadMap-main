-- ============================================================================
-- Notification preferences schema for /dashboard/settings Notifications section.
-- Stores channel toggles, frequency, and category preferences per user.
-- One statement per column for compatibility and clearer errors.
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_channel_email BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_channel_sms BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_channel_push BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'immediate';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_marketing_news BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_marketing_tips BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_activity_comments BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_activity_mentions BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_security_login_alerts BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.users.notification_channel_email IS 'Receive notifications via email (Settings > Notifications)';
COMMENT ON COLUMN public.users.notification_channel_sms IS 'Receive notifications via SMS (Settings > Notifications)';
COMMENT ON COLUMN public.users.notification_channel_push IS 'Receive push notifications (Settings > Notifications)';
COMMENT ON COLUMN public.users.notification_frequency IS 'Delivery frequency: immediate, daily, or weekly (Settings > Notifications)';
COMMENT ON COLUMN public.users.notification_marketing_news IS 'News and product updates (Settings > Notifications > Marketing)';
COMMENT ON COLUMN public.users.notification_marketing_tips IS 'Tips and tutorials (Settings > Notifications > Marketing)';
COMMENT ON COLUMN public.users.notification_activity_comments IS 'Comments on tasks/projects (Settings > Notifications > Activity)';
COMMENT ON COLUMN public.users.notification_activity_mentions IS 'Mentions in threads (Settings > Notifications > Activity)';
COMMENT ON COLUMN public.users.notification_security_login_alerts IS 'Login and security alerts (Settings > Notifications > Security)';
