-- ============================================================================
-- RLS policies for avatars storage bucket.
-- Create a public bucket named "avatars" in Dashboard (Storage > New bucket):
--   - Name: avatars, Public: true, Allowed MIME: image/*, Max size: 2MB
-- Or the app will create it via API on first upload.
-- Users can only upload/read/update/delete their own files under path {user_id}/
-- ============================================================================

-- Allow authenticated users to upload to their own folder: avatars/{user_id}/*
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow authenticated users to select (read) their own avatar files
CREATE POLICY "Users can read own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow authenticated users to update their own avatar files (for upsert)
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow authenticated users to delete their own avatar files
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
