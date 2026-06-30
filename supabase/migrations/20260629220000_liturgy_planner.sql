-- Liturgy Planner — Catholic Mass planning add-on.
--
-- One row per Mass. Fixed-cardinality song slots (setting/prelude/
-- opening/psalm/preparation/communion_1/communion_2/praise/closing)
-- live as flat columns; readings + observation / cycle metadata live
-- alongside. The Sunday Cycle (A/B/C) is computed client-side from
-- the mass_date but cached in the row so reports/exports don't have
-- to recompute.
--
-- YouTube links per slot are stored as full URLs; the UI auto-builds
-- a youtube.com/results?search_query=<title> link when no URL is set.

CREATE TABLE IF NOT EXISTS gw_liturgy_masses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL DEFAULT current_tenant_id(),
  owner_user_id        uuid NOT NULL,

  -- When + which Mass. mass_time null = "to be scheduled".
  mass_date            date NOT NULL,
  mass_time            time,
  -- Free-text label for what the day is — e.g. "First Sunday of Advent",
  -- "Solemnity of Mary, Mother of God", "Memorial of St. Francis".
  -- Computed from the calendar util on create, editable thereafter.
  observation          text,
  -- A | B | C (computed from mass_date but cached).
  sunday_cycle         char(1) CHECK (sunday_cycle IN ('A','B','C')),
  liturgical_season    text,        -- 'Advent' | 'Christmas' | 'Lent' | 'Easter' | 'Ordinary Time'

  -- Mass setting — the musical setting used for the ordinary (Gloria,
  -- Sanctus, Mystery of Faith, Amen, Agnus Dei).
  setting_title        text,
  setting_youtube      text,

  -- Song slots.
  prelude_title        text, prelude_youtube      text,
  opening_title        text, opening_youtube      text,
  psalm_title          text, psalm_youtube        text, psalm_full text,
  preparation_title    text, preparation_youtube  text,
  communion_1_title    text, communion_1_youtube  text,
  communion_2_title    text, communion_2_youtube  text,
  praise_title         text, praise_youtube       text,
  closing_title        text, closing_youtube      text,

  -- Readings (free text for v1; v2 hooks up the lectionary lookup).
  first_reading        text,
  responsorial_psalm   text,
  second_reading       text,
  gospel_acclamation   text,
  gospel               text,

  notes                text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_liturgy_masses_tenant_date_idx
  ON gw_liturgy_masses (tenant_id, mass_date DESC);

CREATE INDEX IF NOT EXISTS gw_liturgy_masses_owner_idx
  ON gw_liturgy_masses (owner_user_id, mass_date DESC);

-- ── tenant_id backfill trigger (matches other gw_* tables) ───────────

CREATE OR REPLACE FUNCTION gw_liturgy_masses_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_liturgy_masses_fill_tenant_trg ON gw_liturgy_masses;
CREATE TRIGGER gw_liturgy_masses_fill_tenant_trg
  BEFORE INSERT ON gw_liturgy_masses
  FOR EACH ROW EXECUTE FUNCTION gw_liturgy_masses_fill_tenant();

-- ── updated_at bump ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION gw_liturgy_masses_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_liturgy_masses_touch_trg ON gw_liturgy_masses;
CREATE TRIGGER gw_liturgy_masses_touch_trg
  BEFORE UPDATE ON gw_liturgy_masses
  FOR EACH ROW EXECUTE FUNCTION gw_liturgy_masses_touch();

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE gw_liturgy_masses ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict
  ON gw_liturgy_masses
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Anyone in the tenant can read (worship leaders, choir, musicians);
-- creator + tenant admin can write.
CREATE POLICY liturgy_masses_read
  ON gw_liturgy_masses FOR SELECT
  USING (true);  -- RESTRICTIVE policy above gates by tenant

CREATE POLICY liturgy_masses_insert
  ON gw_liturgy_masses FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY liturgy_masses_update
  ON gw_liturgy_masses FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM gw_profiles p
               WHERE p.user_id = auth.uid()
                 AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM gw_profiles p
               WHERE p.user_id = auth.uid()
                 AND (p.is_admin OR p.is_super_admin))
  );

CREATE POLICY liturgy_masses_delete
  ON gw_liturgy_masses FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM gw_profiles p
               WHERE p.user_id = auth.uid()
                 AND (p.is_admin OR p.is_super_admin))
  );

-- ── Module catalog ───────────────────────────────────────────────────

INSERT INTO public.gw_billing_modules (id, name, description, tier, category, icon, sort_order, is_active)
VALUES (
  'liturgy_planner',
  'Liturgy Planner',
  'Plan Catholic Masses end-to-end: Sunday Cycle A/B/C auto-detect, feast-day calendar, every song slot from Prelude through Closing, YouTube link per song, and one-tap USCCB readings.',
  'addon',
  'plan',
  'church',
  60,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  tier        = EXCLUDED.tier,
  category    = EXCLUDED.category,
  icon        = EXCLUDED.icon,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;
