-- Concert Planner schema.
--
-- A "program" represents one printed concert program — a header (event /
-- venue / date), a stack of pieces in performance order, and optional
-- design state (HTML template + per-tenant overrides, plus an optional
-- Canva design id when the teacher syncs the program out to Canva for
-- fine-tuning).
--
-- Pieces can either reference an existing gw_sheet_music row (so the
-- composer / voicing / soloists prefill from the library) or be a free-
-- form entry typed in by the teacher. RLS mirrors every other tenant-
-- scoped table: tenant_isolation_restrict + a permissive RW for anyone
-- in the tenant.

CREATE TABLE IF NOT EXISTS public.gw_concert_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  subtitle TEXT,
  event_date DATE,
  venue TEXT,
  conductor TEXT,
  performer_group TEXT,        -- "Spelman College Glee Club", etc.
  cover_image_url TEXT,        -- optional banner image
  notes TEXT,                  -- printed below the piece list (e.g. dedications)
  template_kind TEXT NOT NULL DEFAULT 'classical'
    CHECK (template_kind IN ('classical', 'choral', 'festival', 'recital')),
  design_state JSONB NOT NULL DEFAULT '{}'::jsonb,   -- font / color overrides
  canva_design_id TEXT,        -- set when the teacher exports to Canva
  setlist_id UUID,             -- nullable FK; teachers can start from a setlist
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_concert_programs_tenant_idx
  ON public.gw_concert_programs (tenant_id, event_date DESC NULLS LAST, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gw_concert_program_pieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  program_id UUID NOT NULL REFERENCES public.gw_concert_programs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- "section" lets the teacher group pieces under headings ("Sacred",
  -- "Spirituals", "Encore") without spinning up extra tables.
  section_heading TEXT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  composer TEXT,
  arranger TEXT,
  voicing TEXT,
  soloists TEXT,            -- free text — "Soprano: Jane Smith"
  duration_seconds INTEGER, -- optional, for total runtime calc
  program_notes TEXT,       -- short blurb under the title
  sheet_music_id UUID REFERENCES public.gw_sheet_music(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_concert_program_pieces_program_idx
  ON public.gw_concert_program_pieces (program_id, sort_order);

CREATE OR REPLACE FUNCTION public.gw_concert_programs_set_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_gw_concert_programs_set_tenant ON public.gw_concert_programs;
CREATE TRIGGER trg_gw_concert_programs_set_tenant
  BEFORE INSERT ON public.gw_concert_programs
  FOR EACH ROW EXECUTE FUNCTION public.gw_concert_programs_set_tenant();

DROP TRIGGER IF EXISTS trg_gw_concert_program_pieces_set_tenant ON public.gw_concert_program_pieces;
CREATE TRIGGER trg_gw_concert_program_pieces_set_tenant
  BEFORE INSERT ON public.gw_concert_program_pieces
  FOR EACH ROW EXECUTE FUNCTION public.gw_concert_programs_set_tenant();

ALTER TABLE public.gw_concert_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_concert_program_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_concert_programs AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation_restrict ON public.gw_concert_program_pieces AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY concert_programs_rw ON public.gw_concert_programs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY concert_program_pieces_rw ON public.gw_concert_program_pieces
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Register Concert Planner in the billing catalog so the existing module
-- access UI (gw_billing_modules → v_tenant_active_modules) gates it.
-- Tier 'starter' = available to every tenant, matches Viewer / Calendar
-- pattern (the feature isn't billed separately, just toggleable per tenant).
INSERT INTO public.gw_billing_modules (id, name, description, tier, category, icon, is_active, sort_order)
VALUES (
  'concert_planner',
  'Concert Planner',
  'Build and print concert programs from your library. Includes templates plus a Canva export for advanced design.',
  'starter',
  'planning',
  'ClipboardList',
  true,
  150
)
ON CONFLICT (id) DO NOTHING;
