-- Create security definer functions for announcement and communications policies
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Update announcement policies to use security definer functions
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.gw_announcements;
DROP POLICY IF EXISTS "Admins can view all announcements" ON public.gw_announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON public.gw_announcements;

CREATE POLICY "Admins can manage announcements" 
ON public.gw_announcements 
FOR ALL 
TO authenticated
USING (public.is_user_admin());

CREATE POLICY "Admins can view all announcements" 
ON public.gw_announcements 
FOR SELECT 
TO authenticated
USING (public.is_user_admin());

CREATE POLICY "Authenticated users can view announcements" 
ON public.gw_announcements 
FOR SELECT 
TO authenticated
USING (
  (
    (publish_date IS NULL OR publish_date <= now()) 
    AND (expire_date IS NULL OR expire_date > now())
  ) 
  OR public.is_user_admin()
);

-- Update communications policies to use security definer functions
DROP POLICY IF EXISTS "Admins and exec board can manage communications" ON public.gw_communications;
DROP POLICY IF EXISTS "Authenticated users can view communications" ON public.gw_communications;

CREATE POLICY "Admins and exec board can manage communications" 
ON public.gw_communications 
FOR ALL 
TO public
USING (
  public.is_user_admin() 
  OR public.is_user_executive_board_member()
);

CREATE POLICY "Authenticated users can view communications" 
ON public.gw_communications 
FOR SELECT 
TO authenticated
USING (
  status = 'published' 
  OR auth.uid() = sender_id 
  OR public.is_user_admin() 
  OR public.is_user_executive_board_member()
);