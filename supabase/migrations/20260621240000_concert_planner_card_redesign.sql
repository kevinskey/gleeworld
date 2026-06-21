-- Concert Planner — reimagine as a gamma.app-style card builder.
--
-- The old editor was a single-template form-left / preview-right page
-- with a Canva export stub. The new design treats each program as a
-- card stack that's the same data in both Editor and Audience views,
-- with a validation-plus-approval gate before a tenant can publish it
-- to a public slug.
--
-- This migration adds the data the new UI needs without breaking the
-- existing single program + two pieces already in prod. Specifically:
--
-- 1. New gw_concert_roster_sections + gw_concert_roster_members tables
--    so the program can list its performing ensemble grouped by voice
--    part. Roster is separate from gw_concert_program_pieces.section_heading
--    (which is a piece grouping, e.g. "Sacred / Spirituals / Encore").
-- 2. Per-piece rights metadata so the validation engine can flag
--    "unknown" rights and the audience footer can show licensing notes.
-- 3. Header fields the prototype validates against (call_time,
--    accompanist, target_length_minutes).
-- 4. Publish state: published_at, published_by, published_slug. RLS
--    grants anon SELECT only when published_at is non-null.
-- 5. card_layout JSONB so the admin's hide/show + manual reorder choices
--    persist per program without a row-per-card table.
-- 6. theme + print_format columns to replace what template_kind covered.
--    template_kind stays as-is to avoid a destructive rename — the UI
--    just stops surfacing it.

-- ───────────────────────────────────────────────────────────────────
-- 1. Per-piece rights metadata.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.gw_concert_program_pieces
  ADD COLUMN IF NOT EXISTS rights_status TEXT
    CHECK (rights_status IN ('public_domain', 'licensed', 'unknown')),
  ADD COLUMN IF NOT EXISTS copyright_info TEXT;

-- Existing rows: assume unknown so the validation flags them and the
-- admin has to confirm. Keeps the "hard rule on rights accuracy" honest.
UPDATE public.gw_concert_program_pieces
   SET rights_status = 'unknown'
 WHERE rights_status IS NULL;

-- ───────────────────────────────────────────────────────────────────
-- 2. Program-level header + display state.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.gw_concert_programs
  ADD COLUMN IF NOT EXISTS call_time TIME,
  ADD COLUMN IF NOT EXISTS accompanist TEXT,
  ADD COLUMN IF NOT EXISTS target_length_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'classic-concert'
    CHECK (theme IN ('classic-concert', 'modern-show', 'chamber-minimalist')),
  ADD COLUMN IF NOT EXISTS print_format TEXT NOT NULL DEFAULT 'letter-portrait'
    CHECK (print_format IN ('letter-portrait', 'half-fold', 'trifold', 'qr-lobby')),
  ADD COLUMN IF NOT EXISTS card_layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Publish gate. published_at being non-null is the canonical "this
  -- program is live to anonymous visitors" signal; published_slug is
  -- what /program/:slug looks up.
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_slug TEXT;

-- Slug uniqueness across tenants so the public route can resolve by
-- slug alone without a tenant prefix. Partial index keeps NULL slugs
-- (unpublished drafts) from colliding with each other.
CREATE UNIQUE INDEX IF NOT EXISTS gw_concert_programs_published_slug_uniq
  ON public.gw_concert_programs (published_slug)
  WHERE published_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS gw_concert_programs_published_idx
  ON public.gw_concert_programs (published_at DESC)
  WHERE published_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- 3. Roster tables.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_concert_roster_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()
    REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  program_id UUID NOT NULL
    REFERENCES public.gw_concert_programs(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL CHECK (length(trim(section_name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_concert_roster_sections_program_idx
  ON public.gw_concert_roster_sections (program_id, sort_order);

CREATE TABLE IF NOT EXISTS public.gw_concert_roster_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()
    REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  section_id UUID NOT NULL
    REFERENCES public.gw_concert_roster_sections(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL CHECK (length(trim(member_name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_concert_roster_members_section_idx
  ON public.gw_concert_roster_members (section_id, sort_order);

-- ───────────────────────────────────────────────────────────────────
-- 4. RLS — same tenant-isolation pattern + anon SELECT for published.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.gw_concert_roster_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_concert_roster_members  ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gw_concert_roster_sections_set_tenant ON public.gw_concert_roster_sections;
CREATE TRIGGER trg_gw_concert_roster_sections_set_tenant
  BEFORE INSERT ON public.gw_concert_roster_sections
  FOR EACH ROW EXECUTE FUNCTION public.gw_concert_programs_set_tenant();

DROP TRIGGER IF EXISTS trg_gw_concert_roster_members_set_tenant ON public.gw_concert_roster_members;
CREATE TRIGGER trg_gw_concert_roster_members_set_tenant
  BEFORE INSERT ON public.gw_concert_roster_members
  FOR EACH ROW EXECUTE FUNCTION public.gw_concert_programs_set_tenant();

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_concert_roster_sections;
CREATE POLICY tenant_isolation_restrict ON public.gw_concert_roster_sections AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_concert_roster_members;
CREATE POLICY tenant_isolation_restrict ON public.gw_concert_roster_members AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS concert_roster_sections_rw ON public.gw_concert_roster_sections;
CREATE POLICY concert_roster_sections_rw ON public.gw_concert_roster_sections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS concert_roster_members_rw ON public.gw_concert_roster_members;
CREATE POLICY concert_roster_members_rw ON public.gw_concert_roster_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon SELECT for published programs + their pieces + roster. Anon
-- can read a program only if it's published; pieces + roster join on
-- the program, so they need their own anon policy too. The clause
-- (SELECT … FROM gw_concert_programs WHERE …) reads through anon's own
-- (now-permissive) policy on programs, so anon never sees unpublished
-- rows even via an inner-join shortcut.
DROP POLICY IF EXISTS concert_programs_anon_published ON public.gw_concert_programs;
CREATE POLICY concert_programs_anon_published ON public.gw_concert_programs
  FOR SELECT TO anon
  USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS concert_program_pieces_anon_published ON public.gw_concert_program_pieces;
CREATE POLICY concert_program_pieces_anon_published ON public.gw_concert_program_pieces
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_concert_programs p
       WHERE p.id = gw_concert_program_pieces.program_id
         AND p.published_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS concert_roster_sections_anon_published ON public.gw_concert_roster_sections;
CREATE POLICY concert_roster_sections_anon_published ON public.gw_concert_roster_sections
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_concert_programs p
       WHERE p.id = gw_concert_roster_sections.program_id
         AND p.published_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS concert_roster_members_anon_published ON public.gw_concert_roster_members;
CREATE POLICY concert_roster_members_anon_published ON public.gw_concert_roster_members
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
        FROM public.gw_concert_roster_sections s
        JOIN public.gw_concert_programs p ON p.id = s.program_id
       WHERE s.id = gw_concert_roster_members.section_id
         AND p.published_at IS NOT NULL
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 5. Retire the Canva-export blurb in the billing catalog. We're not
--    integrating with Canva (or Gamma) — the new UI is the design tool.
-- ───────────────────────────────────────────────────────────────────

UPDATE public.gw_billing_modules
   SET description = 'Build, validate, and publish concert programs as cards. Editor + audience views from one data set, with a printable program and a public web page.'
 WHERE id = 'concert_planner';

NOTIFY pgrst, 'reload schema';
