-- Restrict drum zone writes to platform / tenant admins.
-- Anonymous + authenticated read stays so every visitor still sees the
-- published layout, but only admins can publish.

DROP POLICY IF EXISTS drum_zones_auth_write ON public.gw_drum_zone_config;

CREATE POLICY drum_zones_admin_write ON public.gw_drum_zone_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
        AND (is_admin = true OR is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
        AND (is_admin = true OR is_super_admin = true)
    )
  );
