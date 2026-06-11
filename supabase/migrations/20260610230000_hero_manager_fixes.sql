-- Hero manager vet fixes (2026-06-10)
-- 1. graduates-docs bucket was never created on the self-hosted stack, so all
--    graduates hero/newsletter uploads failed.
-- 2. Universal slider write policies checked app_roles, but the app assigns
--    admin via gw_profiles — admins without app_roles rows could not save
--    slides (silent RLS failure).
-- 3. storage_auth_insert allowed any authenticated user to create files in
--    admin-managed hero image paths.

INSERT INTO storage.buckets (id, name, public)
VALUES ('graduates-docs', 'graduates-docs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins can manage sliders" ON public.gw_universal_sliders;
CREATE POLICY "Admins can manage sliders" ON public.gw_universal_sliders
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles p
  WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin', 'executive'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.gw_profiles p
  WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin', 'executive'))
));

DROP POLICY IF EXISTS "Admins can manage slider slides" ON public.gw_universal_slider_slides;
CREATE POLICY "Admins can manage slider slides" ON public.gw_universal_slider_slides
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles p
  WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin', 'executive'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.gw_profiles p
  WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin', 'executive'))
));

DROP POLICY IF EXISTS storage_auth_insert ON storage.objects;
CREATE POLICY storage_auth_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin_or_super_admin()
  OR NOT (bucket_id = 'user-files' AND name LIKE 'hero-images/%')
);
