-- Quick schema check for LeadMap
-- Run this first to see what columns exist

-- Check users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check listings table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;

-- Check if Phase 2 columns exist
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'expired'
  ) THEN 'Phase 2 columns EXIST' 
  ELSE 'Phase 2 columns MISSING - Run schema_phase2.sql first!' 
  END as status;

