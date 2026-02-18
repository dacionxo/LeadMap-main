-- ============================================================================
-- Notification event triggers
-- ============================================================================
-- Inserts into notifications when key events occur so they show in the
-- notifications dropdown. Requires notifications table and create_notifications_table.sql.
-- ============================================================================

-- Helper: insert one notification for a user (SECURITY DEFINER so triggers can insert)
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link);
END;
$$;

COMMENT ON FUNCTION public.notify_user IS 'Insert a notification for a user; used by event triggers.';

-- ============================================================================
-- 1. Sent emails (emails table: status changed to sent)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_email_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status <> 'sent') THEN
    PERFORM notify_user(
      NEW.user_id,
      'system',
      'Email sent',
      'Email to ' || COALESCE(NEW.to_email, 'recipient') || ': ' || LEFT(COALESCE(NEW.subject, ''), 80),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_email_sent ON emails;
CREATE TRIGGER trigger_notify_email_sent
  AFTER UPDATE ON emails
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'sent')
  EXECUTE FUNCTION notify_on_email_sent();

-- ============================================================================
-- 2. Received emails (emails table: new row with direction = received)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_email_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Requires emails.direction column (e.g. from email_received_schema)
  IF NEW.direction = 'received' THEN
    PERFORM notify_user(
      NEW.user_id,
      'system',
      'New email received',
      LEFT(COALESCE(NEW.subject, 'No subject'), 100),
      '/dashboard/unibox'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_email_received ON emails;
CREATE TRIGGER trigger_notify_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_email_received();

-- ============================================================================
-- 3. Items moved in lists / item added or removed (list_memberships)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_list_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_list_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT l.user_id, l.name INTO v_user_id, v_list_name
    FROM lists l WHERE l.id = NEW.list_id;
    IF v_user_id IS NOT NULL THEN
      PERFORM notify_user(
        v_user_id,
        'system',
        'Item moved in list',
        'Item added to list "' || COALESCE(v_list_name, 'Untitled') || '"',
        '/dashboard/lists/' || NEW.list_id
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT l.user_id, l.name INTO v_user_id, v_list_name
    FROM lists l WHERE l.id = OLD.list_id;
    IF v_user_id IS NOT NULL THEN
      PERFORM notify_user(
        v_user_id,
        'system',
        'Item moved in list',
        'Item removed from list "' || COALESCE(v_list_name, 'Untitled') || '"',
        '/dashboard/lists'
      );
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_list_membership_insert ON list_memberships;
CREATE TRIGGER trigger_notify_list_membership_insert
  AFTER INSERT ON list_memberships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_list_membership_change();

DROP TRIGGER IF EXISTS trigger_notify_list_membership_delete ON list_memberships;
CREATE TRIGGER trigger_notify_list_membership_delete
  AFTER DELETE ON list_memberships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_list_membership_change();

-- ============================================================================
-- 4. Deals moved (stage change)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    PERFORM notify_user(
      NEW.user_id,
      'system',
      'Deal moved',
      '"' || COALESCE(NEW.title, 'Deal') || '" moved to ' || REPLACE(NEW.stage, '_', ' '),
      '/dashboard/crm/deals'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_deal_stage ON deals;
CREATE TRIGGER trigger_notify_deal_stage
  AFTER UPDATE ON deals
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION notify_on_deal_stage_change();

-- ============================================================================
-- 5. Calendar event added
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_calendar_event_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_user(
    NEW.user_id,
    'system',
    'Calendar event added',
    COALESCE(NEW.title, 'Event') || ' – ' || to_char(NEW.start_time AT TIME ZONE 'UTC', 'Mon DD, HH24:MI') || ' UTC',
    '/dashboard/crm/calendar'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_calendar_event_insert ON calendar_events;
CREATE TRIGGER trigger_notify_calendar_event_insert
  AFTER INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_calendar_event_added();

-- ============================================================================
-- 6. Calendar event removed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_calendar_event_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_user(
    OLD.user_id,
    'system',
    'Calendar event removed',
    COALESCE(OLD.title, 'Event') || ' was deleted',
    '/dashboard/crm/calendar'
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_calendar_event_delete ON calendar_events;
CREATE TRIGGER trigger_notify_calendar_event_delete
  AFTER DELETE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_calendar_event_removed();

-- ============================================================================
-- 7. New calendar connected / calendar synced (calendar_connections)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_calendar_connection_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_user(
      NEW.user_id,
      'system',
      'Calendar connected',
      'New calendar synced: ' || COALESCE(NEW.calendar_name, NEW.email, 'Calendar'),
      '/dashboard/crm/calendar'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.last_sync_at IS DISTINCT FROM NEW.last_sync_at AND NEW.last_sync_at IS NOT NULL THEN
    PERFORM notify_user(
      NEW.user_id,
      'system',
      'Calendar synced',
      COALESCE(NEW.calendar_name, NEW.email) || ' was just synced',
      '/dashboard/crm/calendar'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_calendar_connection_insert ON calendar_connections;
CREATE TRIGGER trigger_notify_calendar_connection_insert
  AFTER INSERT ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_calendar_connection_change();

DROP TRIGGER IF EXISTS trigger_notify_calendar_connection_sync ON calendar_connections;
CREATE TRIGGER trigger_notify_calendar_connection_sync
  AFTER UPDATE OF last_sync_at ON calendar_connections
  FOR EACH ROW
  WHEN (OLD.last_sync_at IS DISTINCT FROM NEW.last_sync_at AND NEW.last_sync_at IS NOT NULL)
  EXECUTE FUNCTION notify_on_calendar_connection_change();

-- ============================================================================
-- 8. New list created (lists)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_list_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_user(
    NEW.user_id,
    'system',
    'New list created',
    'List "' || COALESCE(NEW.name, 'Untitled') || '" was created',
    '/dashboard/lists/' || NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_list_created ON lists;
CREATE TRIGGER trigger_notify_list_created
  AFTER INSERT ON lists
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_list_created();

-- ============================================================================
-- 9. Item moved from prospect table → covered by list_memberships (add/remove)
--    No separate prospect table trigger needed; list_memberships handles
--    "added to list" / "removed from list" which is the move from prospects.
-- ============================================================================

COMMENT ON FUNCTION public.notify_on_email_sent IS 'Notification when an email is marked sent';
COMMENT ON FUNCTION public.notify_on_email_received IS 'Notification when a received email is inserted';
COMMENT ON FUNCTION public.notify_on_list_membership_change IS 'Notification when list items are added or removed';
COMMENT ON FUNCTION public.notify_on_deal_stage_change IS 'Notification when a deal stage changes';
COMMENT ON FUNCTION public.notify_on_calendar_event_added IS 'Notification when a calendar event is created';
COMMENT ON FUNCTION public.notify_on_calendar_event_removed IS 'Notification when a calendar event is deleted';
COMMENT ON FUNCTION public.notify_on_calendar_connection_change IS 'Notification when a calendar is connected or synced';
COMMENT ON FUNCTION public.notify_on_list_created IS 'Notification when a new list is created';
