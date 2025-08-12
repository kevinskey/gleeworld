-- Grant Executive role permissions with granted_by set to an existing admin
WITH admin_user AS (
  SELECT user_id FROM public.gw_profiles 
  WHERE is_admin = true OR is_super_admin = true 
  ORDER BY is_super_admin DESC, is_admin DESC, created_at ASC
  LIMIT 1
)
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
SELECT 'executive' AS role, mods.mname AS module_name, perms.p AS permission_type, true AS is_active,
       (SELECT user_id FROM admin_user) AS granted_by
FROM (VALUES 
  ('music-library'),
  ('media'),
  ('auditions-management'),
  ('student-conductor')
) AS mods(mname)
CROSS JOIN (VALUES ('view'), ('manage')) AS perms(p)
ON CONFLICT (role, module_name, permission_type)
DO UPDATE SET 
  is_active = true,
  granted_by = COALESCE(gw_role_module_permissions.granted_by, (SELECT user_id FROM admin_user));

-- Ensure policy exists to allow creators to select their own marked-scores objects
DROP POLICY IF EXISTS "Owners can view their own marked-scores objects" ON storage.objects;
CREATE POLICY "Owners can view their own marked-scores objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'marked-scores' AND owner = auth.uid()
);
