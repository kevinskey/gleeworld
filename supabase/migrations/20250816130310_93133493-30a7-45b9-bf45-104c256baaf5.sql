-- Create function to check if user has PR Coordinator role
CREATE OR REPLACE FUNCTION public.user_has_pr_coordinator_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param 
    AND position = 'pr_manager' 
    AND is_active = true
  );
$$;

-- Update bulletin_posts policies to allow PR coordinators to manage all posts
DROP POLICY IF EXISTS "bulletin_posts_pr_manager_manage" ON public.bulletin_posts;
CREATE POLICY "bulletin_posts_pr_manager_manage" 
ON public.bulletin_posts 
FOR ALL 
USING (user_has_pr_coordinator_role(auth.uid()))
WITH CHECK (user_has_pr_coordinator_role(auth.uid()));

-- Update gw_spotlight_content policies to allow PR coordinators to manage all spotlight content
DROP POLICY IF EXISTS "gw_spotlight_content_pr_manager_manage" ON public.gw_spotlight_content;
CREATE POLICY "gw_spotlight_content_pr_manager_manage" 
ON public.gw_spotlight_content 
FOR ALL 
USING (user_has_pr_coordinator_role(auth.uid()))
WITH CHECK (user_has_pr_coordinator_role(auth.uid()));

-- Grant role-based module permissions for fan management to PR coordinators
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
VALUES 
  ('pr_manager', 'fan-management', 'manage', true, auth.uid()),
  ('pr_manager', 'bulletin-posts', 'manage', true, auth.uid()),
  ('pr_manager', 'spotlight-content', 'manage', true, auth.uid())
ON CONFLICT (role, module_name, permission_type) 
DO UPDATE SET 
  is_active = EXCLUDED.is_active,
  granted_by = EXCLUDED.granted_by;

-- Grant user-specific permissions for your account
INSERT INTO public.gw_user_permissions (user_id, permission_name, is_active, granted_by)
SELECT auth.uid(), 'fan-management', true, auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, permission_name) 
DO UPDATE SET 
  is_active = EXCLUDED.is_active,
  granted_by = EXCLUDED.granted_by;

INSERT INTO public.gw_user_permissions (user_id, permission_name, is_active, granted_by)
SELECT auth.uid(), 'bulletin-posts-manage', true, auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, permission_name) 
DO UPDATE SET 
  is_active = EXCLUDED.is_active,
  granted_by = EXCLUDED.granted_by;

INSERT INTO public.gw_user_permissions (user_id, permission_name, is_active, granted_by)
SELECT auth.uid(), 'spotlight-content-manage', true, auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, permission_name) 
DO UPDATE SET 
  is_active = EXCLUDED.is_active,
  granted_by = EXCLUDED.granted_by;