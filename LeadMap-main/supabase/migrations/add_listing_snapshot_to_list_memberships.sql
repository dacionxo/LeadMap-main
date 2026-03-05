-- Migration: Add listing_snapshot columns to list_memberships
-- Purpose: Preserve historical list data even if underlying listings
--          are deleted from FSBO/FRBO/etc. source tables.

ALTER TABLE list_memberships
  ADD COLUMN IF NOT EXISTS listing_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS listing_snapshot_created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN list_memberships.listing_snapshot IS
  'Snapshot of listing data at the time the item was added to the list; used to preserve historical context when source listings are deleted.';

COMMENT ON COLUMN list_memberships.listing_snapshot_created_at IS
  'Timestamp when listing_snapshot was captured.';

