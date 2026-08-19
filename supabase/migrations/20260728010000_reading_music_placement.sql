CREATE TABLE IF NOT EXISTS gw_reading_music_placement (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  level      integer NOT NULL CHECK (level BETWEEN 1 AND 16),
  taken_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS gw_reading_music_placement_tenant_idx
  ON gw_reading_music_placement (tenant_id, taken_at DESC);

ALTER TABLE gw_reading_music_placement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_rmp_tenant_iso ON gw_reading_music_placement;
CREATE POLICY gw_rmp_tenant_iso
  ON gw_reading_music_placement AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS gw_rmp_self_all ON gw_reading_music_placement;
CREATE POLICY gw_rmp_self_all
  ON gw_reading_music_placement FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS gw_rmp_teacher_read ON gw_reading_music_placement;
CREATE POLICY gw_rmp_teacher_read
  ON gw_reading_music_placement FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

DROP TRIGGER IF EXISTS trg_gw_rmp_tenant_default ON gw_reading_music_placement;
CREATE TRIGGER trg_gw_rmp_tenant_default
  BEFORE INSERT ON gw_reading_music_placement
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_default();
