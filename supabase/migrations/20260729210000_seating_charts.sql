-- Seating Charts: standalone feature extracted from Tour Manager.
-- Six new tables with tenant isolation. Legacy gw_tour_risers + gw_bus_seats
-- remain intact for rollback; a backfill copies their contents into the new
-- shared model so both surfaces read/write the same data going forward.

-- 1. Chart mode + status enums (chart_mode = which editor variant renders)
DO $$ BEGIN
  CREATE TYPE gw_seating_chart_mode AS ENUM ('seating', 'stage_plot', 'classroom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gw_seating_chart_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gw_seating_chart_orientation AS ENUM ('landscape', 'portrait');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gw_seating_object_type AS ENUM (
    'seat', 'chair', 'riser_slot', 'table', 'desk', 'music_stand',
    'instrument', 'microphone', 'monitor', 'stage_boundary',
    'label', 'shape'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gw_seating_assignment_status AS ENUM ('assigned', 'absent', 'substitute', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gw_seating_association_type AS ENUM (
    'ensemble', 'course', 'event', 'tour', 'tour_event', 'venue', 'production'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gw_seating_share_role AS ENUM (
    'owner', 'editor', 'viewer', 'performer', 'section_leader', 'stage_crew', 'substitute'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. gw_seating_charts (chart shell)
CREATE TABLE IF NOT EXISTS public.gw_seating_charts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  owner_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  chart_mode    gw_seating_chart_mode NOT NULL DEFAULT 'seating',
  template_key  text,
  status        gw_seating_chart_status NOT NULL DEFAULT 'active',
  canvas_width  integer NOT NULL DEFAULT 1200,
  canvas_height integer NOT NULL DEFAULT 800,
  orientation   gw_seating_chart_orientation NOT NULL DEFAULT 'landscape',
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz
);
CREATE INDEX IF NOT EXISTS gw_seating_charts_tenant_updated_idx
  ON public.gw_seating_charts (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gw_seating_charts_owner_idx
  ON public.gw_seating_charts (owner_id);

-- 3. gw_seating_chart_arrangements (versions per chart)
CREATE TABLE IF NOT EXISTS public.gw_seating_chart_arrangements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  chart_id        uuid NOT NULL REFERENCES public.gw_seating_charts(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Default',
  description     text,
  is_default      boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0,
  layout_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_scarr_chart_idx
  ON public.gw_seating_chart_arrangements (chart_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS gw_scarr_one_default
  ON public.gw_seating_chart_arrangements (chart_id) WHERE is_default;

-- 4. gw_seating_chart_objects (canvas objects — chairs, risers, mics, labels, …)
CREATE TABLE IF NOT EXISTS public.gw_seating_chart_objects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  arrangement_id  uuid NOT NULL REFERENCES public.gw_seating_chart_arrangements(id) ON DELETE CASCADE,
  object_type     gw_seating_object_type NOT NULL,
  subtype         text,
  x               numeric NOT NULL DEFAULT 0,
  y               numeric NOT NULL DEFAULT 0,
  width           numeric NOT NULL DEFAULT 40,
  height          numeric NOT NULL DEFAULT 40,
  rotation        numeric NOT NULL DEFAULT 0,
  z_index         integer NOT NULL DEFAULT 0,
  label           text,
  style           jsonb NOT NULL DEFAULT '{}'::jsonb,
  properties      jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked          boolean NOT NULL DEFAULT false,
  group_id        uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_sc_objects_arrangement_idx
  ON public.gw_seating_chart_objects (arrangement_id, z_index);
CREATE INDEX IF NOT EXISTS gw_sc_objects_group_idx
  ON public.gw_seating_chart_objects (group_id) WHERE group_id IS NOT NULL;

-- 5. gw_seating_chart_assignments (person ↔ object)
CREATE TABLE IF NOT EXISTS public.gw_seating_chart_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  arrangement_id      uuid NOT NULL REFERENCES public.gw_seating_chart_arrangements(id) ON DELETE CASCADE,
  chart_object_id     uuid NOT NULL REFERENCES public.gw_seating_chart_objects(id) ON DELETE CASCADE,
  profile_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  external_person_id  text,
  display_name        text,
  section             text,
  voice_part          text,
  instrument          text,
  chair_number        integer,
  assignment_status   gw_seating_assignment_status NOT NULL DEFAULT 'assigned',
  properties          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chart_object_id)
);
CREATE INDEX IF NOT EXISTS gw_sc_assign_arrangement_idx
  ON public.gw_seating_chart_assignments (arrangement_id);
CREATE INDEX IF NOT EXISTS gw_sc_assign_profile_idx
  ON public.gw_seating_chart_assignments (profile_id) WHERE profile_id IS NOT NULL;

-- 6. gw_seating_chart_associations (chart ↔ ensemble/course/event/tour/…)
CREATE TABLE IF NOT EXISTS public.gw_seating_chart_associations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  chart_id          uuid NOT NULL REFERENCES public.gw_seating_charts(id) ON DELETE CASCADE,
  association_type  gw_seating_association_type NOT NULL,
  association_id    uuid NOT NULL,
  arrangement_id    uuid REFERENCES public.gw_seating_chart_arrangements(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chart_id, association_type, association_id)
);
CREATE INDEX IF NOT EXISTS gw_sc_assoc_lookup_idx
  ON public.gw_seating_chart_associations (association_type, association_id);

-- 7. gw_seating_chart_shares (per-user grants)
CREATE TABLE IF NOT EXISTS public.gw_seating_chart_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  chart_id    uuid NOT NULL REFERENCES public.gw_seating_charts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        gw_seating_share_role NOT NULL DEFAULT 'viewer',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chart_id, user_id)
);

-- 8. Tenant-default + updated_at triggers (all six tables)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_seating_charts',
    'gw_seating_chart_arrangements',
    'gw_seating_chart_objects',
    'gw_seating_chart_assignments',
    'gw_seating_chart_associations',
    'gw_seating_chart_shares'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_tenant_default ON public.%1$s; ' ||
      'CREATE TRIGGER trg_%1$s_tenant_default BEFORE INSERT ON public.%1$s ' ||
      'FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();',
      t
    );
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_seating_charts',
    'gw_seating_chart_arrangements',
    'gw_seating_chart_objects',
    'gw_seating_chart_assignments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s; ' ||
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s ' ||
      'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t
    );
  END LOOP;
END $$;

-- 9. RLS: enable + RESTRICTIVE tenant-iso on every table
ALTER TABLE public.gw_seating_charts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_seating_chart_arrangements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_seating_chart_objects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_seating_chart_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_seating_chart_associations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_seating_chart_shares         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_seating_charts',
    'gw_seating_chart_arrangements',
    'gw_seating_chart_objects',
    'gw_seating_chart_assignments',
    'gw_seating_chart_associations',
    'gw_seating_chart_shares'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_tenant_iso ON public.%1$s; ' ||
      'CREATE POLICY %1$s_tenant_iso ON public.%1$s AS RESTRICTIVE ' ||
      'FOR ALL TO authenticated, anon ' ||
      'USING (tenant_id = public.current_tenant_id()) ' ||
      'WITH CHECK (tenant_id = public.current_tenant_id());',
      t
    );
  END LOOP;
END $$;

-- 10. Permissive per-role policies
-- gw_seating_charts: owner or tenant admin can manage; any tenant member reads.
DROP POLICY IF EXISTS gw_seating_charts_read ON public.gw_seating_charts;
CREATE POLICY gw_seating_charts_read ON public.gw_seating_charts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gw_seating_charts_owner_write ON public.gw_seating_charts;
CREATE POLICY gw_seating_charts_owner_write ON public.gw_seating_charts
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin());

-- Arrangements / objects / assignments follow the chart's owner.
DROP POLICY IF EXISTS gw_scarr_read ON public.gw_seating_chart_arrangements;
CREATE POLICY gw_scarr_read ON public.gw_seating_chart_arrangements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gw_scarr_write ON public.gw_seating_chart_arrangements;
CREATE POLICY gw_scarr_write ON public.gw_seating_chart_arrangements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gw_seating_charts c
                 WHERE c.id = chart_id
                   AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gw_seating_charts c
                      WHERE c.id = chart_id
                        AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())));

DROP POLICY IF EXISTS gw_scobj_read ON public.gw_seating_chart_objects;
CREATE POLICY gw_scobj_read ON public.gw_seating_chart_objects
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gw_scobj_write ON public.gw_seating_chart_objects;
CREATE POLICY gw_scobj_write ON public.gw_seating_chart_objects
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gw_seating_chart_arrangements a
                 JOIN public.gw_seating_charts c ON c.id = a.chart_id
                 WHERE a.id = arrangement_id
                   AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gw_seating_chart_arrangements a
                      JOIN public.gw_seating_charts c ON c.id = a.chart_id
                      WHERE a.id = arrangement_id
                        AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())));

DROP POLICY IF EXISTS gw_scasn_read ON public.gw_seating_chart_assignments;
CREATE POLICY gw_scasn_read ON public.gw_seating_chart_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gw_scasn_write ON public.gw_seating_chart_assignments;
CREATE POLICY gw_scasn_write ON public.gw_seating_chart_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gw_seating_chart_arrangements a
                 JOIN public.gw_seating_charts c ON c.id = a.chart_id
                 WHERE a.id = arrangement_id
                   AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gw_seating_chart_arrangements a
                      JOIN public.gw_seating_charts c ON c.id = a.chart_id
                      WHERE a.id = arrangement_id
                        AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())));

DROP POLICY IF EXISTS gw_scassoc_read ON public.gw_seating_chart_associations;
CREATE POLICY gw_scassoc_read ON public.gw_seating_chart_associations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gw_scassoc_write ON public.gw_seating_chart_associations;
CREATE POLICY gw_scassoc_write ON public.gw_seating_chart_associations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gw_seating_charts c
                 WHERE c.id = chart_id
                   AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gw_seating_charts c
                      WHERE c.id = chart_id
                        AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())));

DROP POLICY IF EXISTS gw_scshare_read ON public.gw_seating_chart_shares;
CREATE POLICY gw_scshare_read ON public.gw_seating_chart_shares
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.gw_seating_charts c
                    WHERE c.id = chart_id AND c.owner_id = auth.uid())
         OR public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS gw_scshare_write ON public.gw_seating_chart_shares;
CREATE POLICY gw_scshare_write ON public.gw_seating_chart_shares
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gw_seating_charts c
                 WHERE c.id = chart_id
                   AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gw_seating_charts c
                      WHERE c.id = chart_id
                        AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())));

-- 11. Backfill legacy gw_tour_risers → shared model
-- For each distinct template_name, create one chart + one default arrangement
-- with 4 rows × 12 riser_slot objects; copy any user_id into an assignment.
DO $$
DECLARE
  v_template   text;
  v_chart_id   uuid;
  v_arr_id     uuid;
  v_owner      uuid;
  v_tenant     uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'gw_tour_risers') THEN
    FOR v_template IN
      SELECT DISTINCT template_name FROM public.gw_tour_risers
    LOOP
      -- Pick the tenant from any related roster row; else NULL (skip).
      SELECT COALESCE(
        (SELECT tenant_id FROM public.gw_tenants ORDER BY created_at LIMIT 1),
        NULL
      ) INTO v_tenant;
      IF v_tenant IS NULL THEN CONTINUE; END IF;

      -- Owner: first admin from the tenant, else NULL
      SELECT p.user_id INTO v_owner
      FROM public.gw_profiles p
      WHERE p.tenant_id = v_tenant AND (p.is_admin OR p.is_super_admin)
      ORDER BY p.created_at NULLS LAST LIMIT 1;

      -- Skip if this legacy chart already imported (idempotent).
      IF EXISTS (
        SELECT 1 FROM public.gw_seating_charts
        WHERE template_key = 'choir_risers_legacy'
          AND name = ('Risers — ' || v_template)
          AND tenant_id = v_tenant
      ) THEN CONTINUE; END IF;

      INSERT INTO public.gw_seating_charts
        (tenant_id, owner_id, name, description, chart_mode, template_key,
         canvas_width, canvas_height, orientation, settings)
      VALUES (v_tenant, v_owner,
              'Risers — ' || v_template,
              'Imported from Tour Manager risers',
              'seating', 'choir_risers_legacy',
              1200, 800, 'landscape',
              jsonb_build_object('legacy_source', 'gw_tour_risers',
                                 'legacy_template_name', v_template))
      RETURNING id INTO v_chart_id;

      INSERT INTO public.gw_seating_chart_arrangements
        (tenant_id, chart_id, name, is_default, sort_order)
      VALUES (v_tenant, v_chart_id, 'Default', true, 0)
      RETURNING id INTO v_arr_id;

      -- Create one riser_slot per legacy row/position; assign users where set.
      INSERT INTO public.gw_seating_chart_objects
        (tenant_id, arrangement_id, object_type, subtype, x, y, width, height,
         z_index, label, properties)
      SELECT
        v_tenant, v_arr_id, 'riser_slot', 'choir',
        60 + (r.position - 1) * 80,           -- x
        120 + (r.row_number - 1) * 80,        -- y
        60, 60, 10,
        'Row ' || r.row_number || ' · ' || r.position,
        jsonb_build_object('row', r.row_number, 'position', r.position,
                           'legacy_id', r.id)
      FROM public.gw_tour_risers r
      WHERE r.template_name = v_template;

      -- Assignments (only rows with user_id)
      INSERT INTO public.gw_seating_chart_assignments
        (tenant_id, arrangement_id, chart_object_id, profile_id, chair_number)
      SELECT
        v_tenant, v_arr_id, o.id, r.user_id,
        (o.properties->>'position')::int
      FROM public.gw_tour_risers r
      JOIN public.gw_seating_chart_objects o
        ON o.arrangement_id = v_arr_id
       AND (o.properties->>'legacy_id')::uuid = r.id
      WHERE r.template_name = v_template AND r.user_id IS NOT NULL;
    END LOOP;
  END IF;
END $$;

-- 12. Backfill legacy gw_bus_seats → shared model
DO $$
DECLARE
  v_chart_id uuid;
  v_arr_id   uuid;
  v_owner    uuid;
  v_tenant   uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'gw_bus_seats')
     AND EXISTS (SELECT 1 FROM public.gw_bus_seats)
  THEN
    SELECT tenant_id FROM public.gw_tenants ORDER BY created_at LIMIT 1 INTO v_tenant;
    IF v_tenant IS NULL THEN RETURN; END IF;

    SELECT p.user_id INTO v_owner
    FROM public.gw_profiles p
    WHERE p.tenant_id = v_tenant AND (p.is_admin OR p.is_super_admin)
    ORDER BY p.created_at NULLS LAST LIMIT 1;

    IF EXISTS (SELECT 1 FROM public.gw_seating_charts
               WHERE template_key = 'bus_seats_legacy' AND tenant_id = v_tenant)
    THEN RETURN; END IF;

    INSERT INTO public.gw_seating_charts
      (tenant_id, owner_id, name, description, chart_mode, template_key,
       canvas_width, canvas_height, orientation, settings)
    VALUES (v_tenant, v_owner, 'Bus Seating', 'Imported from Tour Manager bus seats',
            'seating', 'bus_seats_legacy', 700, 2200, 'portrait',
            jsonb_build_object('legacy_source', 'gw_bus_seats'))
    RETURNING id INTO v_chart_id;

    INSERT INTO public.gw_seating_chart_arrangements
      (tenant_id, chart_id, name, is_default, sort_order)
    VALUES (v_tenant, v_chart_id, 'Default', true, 0)
    RETURNING id INTO v_arr_id;

    -- 25 rows × 4 columns (A/B, aisle, C/D)
    INSERT INTO public.gw_seating_chart_objects
      (tenant_id, arrangement_id, object_type, subtype, x, y, width, height,
       z_index, label, properties)
    SELECT
      v_tenant, v_arr_id, 'seat', 'bus',
      CASE bs.seat_letter
        WHEN 'A' THEN 100
        WHEN 'B' THEN 180
        WHEN 'C' THEN 340
        WHEN 'D' THEN 420
      END,
      80 + (bs.row_number - 1) * 80,
      70, 70, 10,
      bs.row_number || bs.seat_letter,
      jsonb_build_object('row', bs.row_number, 'letter', bs.seat_letter,
                         'legacy_id', bs.id, 'purpose', bs.seat_purpose,
                         'is_double', bs.is_double_seat)
    FROM public.gw_bus_seats bs;

    INSERT INTO public.gw_seating_chart_assignments
      (tenant_id, arrangement_id, chart_object_id, profile_id)
    SELECT
      v_tenant, v_arr_id, o.id, bs.user_id
    FROM public.gw_bus_seats bs
    JOIN public.gw_seating_chart_objects o
      ON o.arrangement_id = v_arr_id
     AND (o.properties->>'legacy_id')::uuid = bs.id
    WHERE bs.user_id IS NOT NULL;
  END IF;
END $$;

-- End of seating-charts migration.
