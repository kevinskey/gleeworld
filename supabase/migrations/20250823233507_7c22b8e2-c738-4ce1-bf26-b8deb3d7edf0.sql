-- Create a function to cleanup duplicate bucket of love entries for the current user
CREATE OR REPLACE FUNCTION public.cleanup_user_duplicate_buckets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duplicate_count INTEGER;
  deleted_count INTEGER := 0;
  duplicate_ids UUID[];
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Find duplicate entries for the specific message and timestamp
  SELECT array_agg(id ORDER BY id) INTO duplicate_ids
  FROM gw_buckets_of_love 
  WHERE message = 'Wishing all of our 105 members a safe and successful semester! DOC' 
  AND created_at = '2025-08-23T23:07:37.100057+00:00'
  AND user_id = auth.uid();
  
  duplicate_count := array_length(duplicate_ids, 1);
  
  IF duplicate_count IS NULL OR duplicate_count <= 1 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No duplicates found', 'deleted', 0);
  END IF;
  
  -- Delete all but the first entry (keep the first, delete the rest)
  FOR i IN 2..duplicate_count LOOP
    DELETE FROM gw_buckets_of_love WHERE id = duplicate_ids[i] AND user_id = auth.uid();
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Duplicates cleaned up successfully',
    'deleted', deleted_count,
    'total_found', duplicate_count
  );
END;
$$;