-- Grant Executive role 'view' and 'manage' permissions to key modules
DO $$
DECLARE
  mod RECORD;
  role_text TEXT := 'executive';
BEGIN
  FOR mod IN 
    SELECT id, name 
    FROM public.gw_modules 
    WHERE name IN ('music-library', 'auditions-management', 'media', 'student-conductor')
  LOOP
    -- Upsert 'view' permission
    IF EXISTS (
      SELECT 1 FROM public.gw_role_module_permissions 
      WHERE role = role_text AND module_id = mod.id AND permission_type = 'view'
    ) THEN
      UPDATE public.gw_role_module_permissions
      SET is_active = true, updated_at = now()
      WHERE role = role_text AND module_id = mod.id AND permission_type = 'view';
    ELSE
      INSERT INTO public.gw_role_module_permissions (role, module_id, permission_type, is_active)
      VALUES (role_text, mod.id, 'view', true);
    END IF;

    -- Upsert 'manage' permission
    IF EXISTS (
      SELECT 1 FROM public.gw_role_module_permissions 
      WHERE role = role_text AND module_id = mod.id AND permission_type = 'manage'
    ) THEN
      UPDATE public.gw_role_module_permissions
      SET is_active = true, updated_at = now()
      WHERE role = role_text AND module_id = mod.id AND permission_type = 'manage';
    ELSE
      INSERT INTO public.gw_role_module_permissions (role, module_id, permission_type, is_active)
      VALUES (role_text, mod.id, 'manage', true);
    END IF;
  END LOOP;
END $$;

-- Ensure policy exists to allow creators to select their own marked-scores objects
DROP POLICY IF EXISTS "Owners can view their own marked-scores objects" ON storage.objects;
CREATE POLICY "Owners can view their own marked-scores objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'marked-scores' AND owner = auth.uid()
);
