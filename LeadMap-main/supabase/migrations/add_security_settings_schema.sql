-- ============================================================================
-- Security settings schema for /dashboard/settings Security section.
-- Tracks password change and supports future security preferences (e.g. 2FA).
-- ============================================================================

-- Optional: track last password change for audit (updated by app or trigger)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_password_changed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.users.last_password_changed_at IS 'When the user last changed their password (Security settings).';

-- Optional: table for security-related events (audit log) if needed later
-- CREATE TABLE IF NOT EXISTS public.security_events (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   event_type TEXT NOT NULL,
--   metadata JSONB DEFAULT '{}',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
-- CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
-- CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
