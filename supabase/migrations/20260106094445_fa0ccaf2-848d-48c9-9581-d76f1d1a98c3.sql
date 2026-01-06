-- Create function to delete recurring events with options
CREATE OR REPLACE FUNCTION public.delete_recurring_gw_events(
  p_event_id uuid,
  p_delete_type text DEFAULT 'this_only' -- 'this_only', 'all_occurrences'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count integer := 0;
  event_record RECORD;
  parent_id uuid;
BEGIN
  -- Get the event to determine if it's a parent or child
  SELECT * INTO event_record FROM public.gw_events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'deleted_count', 0,
      'message', 'Event not found'
    );
  END IF;
  
  -- Determine the parent event id
  parent_id := COALESCE(event_record.parent_event_id, p_event_id);
  
  CASE p_delete_type
    WHEN 'this_only' THEN
      -- Delete only this specific event
      DELETE FROM public.gw_events WHERE id = p_event_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      
    WHEN 'all_occurrences' THEN
      -- If this is the parent event, delete it and all children
      IF event_record.parent_event_id IS NULL THEN
        -- This is the parent - delete all children first, then parent
        DELETE FROM public.gw_events WHERE parent_event_id = p_event_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        DELETE FROM public.gw_events WHERE id = p_event_id;
        deleted_count := deleted_count + 1;
      ELSE
        -- This is a child - delete parent and all siblings
        DELETE FROM public.gw_events WHERE parent_event_id = parent_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        DELETE FROM public.gw_events WHERE id = parent_id;
        deleted_count := deleted_count + 1;
      END IF;
      
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'deleted_count', 0,
        'message', 'Invalid delete type. Use this_only or all_occurrences'
      );
  END CASE;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', 'Successfully deleted ' || deleted_count || ' event(s)'
  );
END;
$$;