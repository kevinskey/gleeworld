-- Revoke Student Conductor access from all Executive Board positions
DO $$
BEGIN
  -- If the mapping table doesn't exist, do nothing
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'gw_executive_position_functions'
  ) THEN
    RAISE NOTICE 'Table gw_executive_position_functions does not exist; skipping revoke.';
    RETURN;
  END IF;

  -- Delete all mappings to the Student Conductor function
  WITH sc_func AS (
    SELECT id 
    FROM public.gw_app_functions 
    WHERE module = 'student-conductor'
  )
  DELETE FROM public.gw_executive_position_functions epf
  USING sc_func
  WHERE epf.function_id = sc_func.id;
END $$;