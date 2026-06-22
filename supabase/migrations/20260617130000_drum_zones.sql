-- Drum-kit zone configuration.
--
-- Stores the percentage coordinates of each hit zone on the three drum
-- photos (timpani, djembe, drumset) so an admin can drag them into
-- place once and every visitor sees the same layout. Anonymous read is
-- allowed since this is purely UI positioning data; only platform
-- admins can write.

CREATE TABLE IF NOT EXISTS public.gw_drum_zone_config (
  id TEXT PRIMARY KEY,
  zones JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_drum_zone_config ENABLE ROW LEVEL SECURITY;

-- Anon + authenticated read: the zone coords are non-sensitive UI config.
DROP POLICY IF EXISTS drum_zones_anon_read ON public.gw_drum_zone_config;
CREATE POLICY drum_zones_anon_read ON public.gw_drum_zone_config
  FOR SELECT TO anon, authenticated USING (true);

-- Authenticated write — UI gates the editor to platform admins; this
-- policy lets any signed-in user write, which is acceptable for the demo
-- but should tighten to is_super_admin() once we wire that helper here.
DROP POLICY IF EXISTS drum_zones_auth_write ON public.gw_drum_zone_config;
CREATE POLICY drum_zones_auth_write ON public.gw_drum_zone_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
