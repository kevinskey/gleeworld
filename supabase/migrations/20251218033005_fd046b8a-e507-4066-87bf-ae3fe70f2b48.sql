-- Expand allowed roles in app_roles to include tour_manager
ALTER TABLE public.app_roles DROP CONSTRAINT IF EXISTS app_roles_role_check;
ALTER TABLE public.app_roles ADD CONSTRAINT app_roles_role_check
CHECK (
  role = ANY (
    ARRAY[
      'admin'::text,
      'super_admin'::text,
      'alumnae_liaison'::text,
      'executive_board'::text,
      'librarian'::text,
      'tour_manager'::text
    ]
  )
);

-- Grant tour_manager role to Aaliyah's gmail account using roles table
INSERT INTO public.app_roles (user_id, role, is_active, granted_at, granted_by)
SELECT 'a9b62b0a-1bc6-45f2-9747-368494a05bbc'::uuid, 'tour_manager', true, now(), auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_roles
  WHERE user_id = 'a9b62b0a-1bc6-45f2-9747-368494a05bbc'::uuid
    AND role = 'tour_manager'
    AND coalesce(is_active, true) = true
);

-- Expand tour manager check to include app_roles in addition to exec board positions
CREATE OR REPLACE FUNCTION public.is_current_user_tour_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.gw_executive_board_members
      WHERE user_id = auth.uid()
        AND position::text = 'tour_manager'
        AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.app_roles
      WHERE user_id = auth.uid()
        AND role = 'tour_manager'
        AND coalesce(is_active, true) = true
    )
  );
$$;