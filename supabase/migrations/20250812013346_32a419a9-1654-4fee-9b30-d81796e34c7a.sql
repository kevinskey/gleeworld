-- Grant Executive role 'view' and 'manage' permissions to key modules by module_name
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active)
SELECT 'executive' AS role, mods.mname AS module_name, perms.p AS permission_type, true AS is_active
FROM (VALUES 
  ('music-library'),
  ('media'),
  ('auditions-management'),
  ('student-conductor')
) AS mods(mname)
CROSS JOIN (VALUES ('view'), ('manage')) AS perms(p)
ON CONFLICT (role, module_name, permission_type)
DO UPDATE SET is_active = true;

-- Ensure policy exists to allow creators to select their own marked-scores objects
DROP POLICY IF EXISTS "Owners can view their own marked-scores objects" ON storage.objects;
CREATE POLICY "Owners can view their own marked-scores objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'marked-scores' AND owner = auth.uid()
);
