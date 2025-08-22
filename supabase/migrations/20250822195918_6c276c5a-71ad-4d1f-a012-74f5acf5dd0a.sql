-- Function to grant all executive board members full access to all modules
CREATE OR REPLACE FUNCTION public.grant_exec_board_all_modules()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  exec_member RECORD;
  module RECORD;
  granted_count INTEGER := 0;
  total_grants INTEGER := 0;
BEGIN
  -- Loop through all active executive board members
  FOR exec_member IN 
    SELECT user_id 
    FROM public.gw_executive_board_members 
    WHERE is_active = true
  LOOP
    -- Loop through all active modules
    FOR module IN 
      SELECT id 
      FROM public.gw_modules 
      WHERE is_active = true
    LOOP
      -- Grant manage permission (which includes view)
      INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
      VALUES (exec_member.user_id, module.id, 'manage', true)
      ON CONFLICT (user_id, module_id, permission_type) 
      DO UPDATE SET is_active = true;
      
      granted_count := granted_count + 1;
    END LOOP;
  END LOOP;
  
  -- Count total possible grants
  SELECT COUNT(*) INTO total_grants
  FROM (
    SELECT eb.user_id, m.id 
    FROM public.gw_executive_board_members eb 
    CROSS JOIN public.gw_modules m 
    WHERE eb.is_active = true AND m.is_active = true
  ) AS total;
  
  RETURN jsonb_build_object(
    'success', true,
    'grants_processed', granted_count,
    'total_possible_grants', total_grants,
    'message', 'All executive board members have been granted full access to all modules'
  );
END;
$$;