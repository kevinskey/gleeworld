-- Grant Ariana view+manage for Student Conductor, Music Library, and Auditions
-- And grant Exec Board (role 'executive') view+manage for Media Library

-- Ensure case-insensitive match on email and module names exist
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find Ariana's user id
  SELECT user_id INTO v_user_id
  FROM public.gw_profiles
  WHERE lower(email) = lower('arianaswindell@spelman.edu')
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found for email %', 'arianaswindell@spelman.edu';
  END IF;
  
  -- Upsert user-specific permissions for the three modules (both view and manage)
  INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
  SELECT 
    v_user_id,
    m.id,
    p.permission_type,
    true
  FROM public.gw_modules m
  JOIN (VALUES ('view'), ('manage')) AS p(permission_type) ON TRUE
  WHERE m.is_active = true
    AND m.name IN ('Student Conductor', 'Music Library', 'Auditions')
  ON CONFLICT (user_id, module_id, permission_type)
  DO UPDATE SET is_active = TRUE;
  
  -- Also ensure there are no disabled duplicates lingering
  UPDATE public.gw_module_permissions gmp
  SET is_active = true
  WHERE gmp.user_id = v_user_id
    AND gmp.permission_type IN ('view','manage')
    AND gmp.module_id IN (
      SELECT id FROM public.gw_modules 
      WHERE name IN ('Student Conductor', 'Music Library', 'Auditions')
    );
END$$;

-- Role-based permission for Exec Board to manage Media Library (and view so it shows up)
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type)
VALUES 
  ('executive', 'Media Library', 'view'),
  ('executive', 'Media Library', 'manage')
ON CONFLICT (role, module_name, permission_type) DO NOTHING;