-- Add ON DELETE CASCADE to gw_course_class_sessions.gw_event_id foreign key
-- This ensures when events are deleted from Command Center, linked sessions are cleaned up

-- First, drop the existing constraint if it exists
ALTER TABLE public.gw_course_class_sessions
DROP CONSTRAINT IF EXISTS gw_course_class_sessions_gw_event_id_fkey;

-- Add the foreign key with CASCADE delete
ALTER TABLE public.gw_course_class_sessions
ADD CONSTRAINT gw_course_class_sessions_gw_event_id_fkey
FOREIGN KEY (gw_event_id) REFERENCES public.gw_events(id) ON DELETE SET NULL;

-- Create a trigger to handle cleanup when gw_events are deleted
-- This will also delete the corresponding class session record
CREATE OR REPLACE FUNCTION public.cleanup_class_session_on_event_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a gw_event is deleted, also delete the linked class session
  DELETE FROM gw_course_class_sessions WHERE gw_event_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Create trigger on gw_events table
DROP TRIGGER IF EXISTS trigger_cleanup_class_session ON public.gw_events;
CREATE TRIGGER trigger_cleanup_class_session
BEFORE DELETE ON public.gw_events
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_class_session_on_event_delete();