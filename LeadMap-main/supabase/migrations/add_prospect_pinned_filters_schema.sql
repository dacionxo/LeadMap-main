-- ============================================================================
-- Prospect Pinned Filters Schema
-- ============================================================================
-- Stores per-user pinned filter configuration for the Prospect Enrich experience.
-- Used by the Prospect Filter Sidebar + Prospect Hover Table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_prospect_filter_pins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Array of filter IDs (e.g. 'price_range', 'location', 'ai_score', etc.)
  pinned_filters TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_prospect_filter_pins_user_id
  ON user_prospect_filter_pins(user_id);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_user_prospect_filter_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_prospect_filter_pins_updated_at
  BEFORE UPDATE ON user_prospect_filter_pins
  FOR EACH ROW
  EXECUTE FUNCTION update_user_prospect_filter_pins_updated_at();

-- Enable RLS
ALTER TABLE user_prospect_filter_pins ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own pins
CREATE POLICY "Users can view their own prospect filter pins"
  ON user_prospect_filter_pins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prospect filter pins"
  ON user_prospect_filter_pins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prospect filter pins"
  ON user_prospect_filter_pins FOR UPDATE
  USING (auth.uid() = user_id);

