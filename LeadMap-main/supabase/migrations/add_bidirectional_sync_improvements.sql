-- ============================================================================
-- Bi-directional Google Calendar Sync Improvements
-- ============================================================================
-- Inspired by:
--   cal-sync   (event_mappings, content_hash, origin_calendar_id, conflict resolution)
--   google_calendar_oauth2  (event shape / sequence tracking)
-- ============================================================================

-- 1. Add content_hash to calendar_events for efficient change detection.
--    SHA-256 of (summary, description, location, start, end, recurrence,
--    transparency, visibility, colorId) – same fields as cal-sync.
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

COMMENT ON COLUMN calendar_events.content_hash IS
  'SHA-256 of comparable event fields; used to skip no-op updates during sync.';

-- Index for fast lookup by external_event_id + user during import loop
CREATE INDEX IF NOT EXISTS idx_calendar_events_external_user
  ON calendar_events(user_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- ============================================================================
-- 2. calendar_event_mappings
--    Tracks the bi-directional relationship between Google Calendar events and
--    local calendar_events rows.  Allows:
--      - Origin-wins conflict resolution (which calendar created the event)
--      - Accurate deletion propagation (find local row from Google event ID)
--      - Audit trail of every sync operation
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id)         ON DELETE CASCADE NOT NULL,
  connection_id         UUID REFERENCES calendar_connections(id) ON DELETE CASCADE NOT NULL,

  -- Google Calendar event ID (stable across edits)
  google_event_id       TEXT NOT NULL,

  -- Local Supabase event ID (nullable: the local row may be deleted)
  local_event_id        UUID REFERENCES calendar_events(id)    ON DELETE SET NULL,

  -- Which side originally created this event
  --   'google'   – event was created in Google Calendar, imported to LeadMap
  --   'leadmap'  – event was created in LeadMap, pushed to Google Calendar
  origin                TEXT NOT NULL DEFAULT 'google'
                        CHECK (origin IN ('google', 'leadmap')),

  -- SHA-256 hash of the Google event at last sync (same as content_hash in events)
  content_hash          TEXT,

  -- Timestamps from Google Calendar for conflict detection
  google_updated_at     TIMESTAMPTZ,

  -- When we last successfully synced this event
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, connection_id, google_event_id)
);

COMMENT ON TABLE calendar_event_mappings IS
  'Bi-directional mapping between Google Calendar events and local calendar_events.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cem_user_connection
  ON calendar_event_mappings(user_id, connection_id);

CREATE INDEX IF NOT EXISTS idx_cem_google_event
  ON calendar_event_mappings(google_event_id);

CREATE INDEX IF NOT EXISTS idx_cem_local_event
  ON calendar_event_mappings(local_event_id)
  WHERE local_event_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_calendar_event_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cem_updated_at ON calendar_event_mappings;
CREATE TRIGGER trg_cem_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW EXECUTE FUNCTION update_calendar_event_mappings_updated_at();

-- RLS
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event mappings"
  ON calendar_event_mappings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own event mappings"
  ON calendar_event_mappings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event mappings"
  ON calendar_event_mappings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event mappings"
  ON calendar_event_mappings FOR DELETE USING (auth.uid() = user_id);
