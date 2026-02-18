-- ============================================================================
-- Add profile fields to public.users for settings (first name, last name,
-- phone, job title, bio, profile picture URL).
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.users.first_name IS 'User first name from profile settings';
COMMENT ON COLUMN public.users.last_name IS 'User last name from profile settings';
COMMENT ON COLUMN public.users.phone IS 'User phone number from profile settings';
COMMENT ON COLUMN public.users.job_title IS 'User job title from profile settings';
COMMENT ON COLUMN public.users.bio IS 'User bio from profile settings (max length enforced in app)';
COMMENT ON COLUMN public.users.avatar_url IS 'Public URL of profile picture (e.g. Supabase Storage avatars bucket)';
