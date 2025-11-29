-- ============================================================================
-- Deals Views Table
-- ============================================================================
-- Stores user-created views for the deals page
-- Similar to the lists table pattern - user-specific views with sharing capability
-- ============================================================================

-- Create deals_views table
CREATE TABLE IF NOT EXISTS deals_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  layout TEXT NOT NULL CHECK (layout IN ('table', 'kanban')),
  group_by TEXT, -- JSON field or null
  visible_fields TEXT[], -- Array of field names
  filters JSONB DEFAULT '{}', -- Applied filters as JSON
  visibility TEXT NOT NULL DEFAULT 'restricted' CHECK (visibility IN ('restricted', 'shared')),
  is_system BOOLEAN DEFAULT FALSE, -- System views (All deals, etc.)
  is_starred BOOLEAN DEFAULT FALSE,
  shared_with_user_ids UUID[], -- Array of user IDs this view is shared with
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deals_views_user_id ON deals_views(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_views_visibility ON deals_views(visibility);
CREATE INDEX IF NOT EXISTS idx_deals_views_is_system ON deals_views(is_system);
CREATE INDEX IF NOT EXISTS idx_deals_views_is_starred ON deals_views(is_starred);

-- Add updated_at trigger
CREATE TRIGGER update_deals_views_updated_at BEFORE UPDATE ON deals_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE deals_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own views and shared views
CREATE POLICY "Users can view their own deals views"
  ON deals_views FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = ANY(shared_with_user_ids) OR visibility = 'shared');

-- Users can insert their own views
CREATE POLICY "Users can create their own deals views"
  ON deals_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own views
CREATE POLICY "Users can update their own deals views"
  ON deals_views FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own views (but not system views)
CREATE POLICY "Users can delete their own deals views"
  ON deals_views FOR DELETE
  USING (auth.uid() = user_id AND is_system = FALSE);

-- ============================================================================
-- Notes:
-- - System views (All deals, Board view, etc.) can be marked with is_system = true
-- - Shared views use visibility = 'shared' or shared_with_user_ids array
-- - Filters and group_by stored as JSON/JSONB for flexibility
-- ============================================================================

