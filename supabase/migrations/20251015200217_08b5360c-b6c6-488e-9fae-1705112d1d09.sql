-- Drop existing check constraint
ALTER TABLE public.app_roles DROP CONSTRAINT IF EXISTS app_roles_role_check;

-- Add updated check constraint with librarian included
ALTER TABLE public.app_roles ADD CONSTRAINT app_roles_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'alumnae_liaison'::text, 'executive_board'::text, 'librarian'::text]));

-- Grant librarian role to Alexandra by email (idempotent)
DO $$
DECLARE
  v_user uuid;
BEGIN
  SELECT user_id INTO v_user 
  FROM public.gw_profiles 
  WHERE lower(email) = lower('alexandrawilliams@spelman.edu') 
  LIMIT 1;
  
  IF v_user IS NOT NULL THEN
    INSERT INTO public.app_roles (user_id, role, is_active)
    SELECT v_user, 'librarian', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.app_roles 
      WHERE user_id = v_user AND role = 'librarian'
    );

    UPDATE public.app_roles 
    SET is_active = true
    WHERE user_id = v_user AND role = 'librarian';
  END IF;
END $$;