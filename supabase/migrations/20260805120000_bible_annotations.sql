-- The Bible — personal annotations: highlights, underlines, and notes.
--
-- Unlike gw_bible_verses (shared, tenant-less reference data), these are USER
-- data: tenant-scoped with RESTRICTIVE isolation AND owner-private, the same
-- shape as gw_planner_notes. What a person marks in their Bible is nobody
-- else's business — not their director's, not their tenant admin's.
--
-- Annotations are stored as TEXT RANGES against a verse, not as freehand ink.
-- Ink drawn over reflowing text breaks the moment the font size, window width
-- or device changes; a character range survives all three and syncs across
-- web and iPad. The Apple Pencil is an INPUT METHOD for creating a range, and
-- `created_via` records that it was used so the UI can default a pencil to
-- underline and a finger to highlight.

CREATE TABLE IF NOT EXISTS public.gw_bible_annotations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Addressed by reference rather than by verse id so an annotation survives a
  -- re-import of the scripture tables (which replaces row ids).
  translation_code text NOT NULL DEFAULT 'WEBCE',
  usfm_code        text NOT NULL,
  chapter          int  NOT NULL,
  verse            int  NOT NULL,

  -- NULL start/end = the whole verse. Otherwise a character range within it.
  start_offset     int,
  end_offset       int,

  style            text NOT NULL DEFAULT 'highlight'
                     CHECK (style IN ('highlight','underline')),
  -- Token-friendly names, not hex: the renderer maps these so a tenant theme
  -- change never leaves an unreadable marking behind.
  color            text NOT NULL DEFAULT 'yellow'
                     CHECK (color IN ('yellow','green','blue','pink','orange','purple')),
  -- 'pen' means Apple Pencil. Kept so the UI can explain why a mark is an
  -- underline rather than a highlight, and so we can measure Pencil use.
  created_via      text NOT NULL DEFAULT 'touch'
                     CHECK (created_via IN ('touch','pen','mouse','keyboard')),

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CHECK (start_offset IS NULL OR end_offset IS NULL OR end_offset > start_offset)
);

CREATE INDEX IF NOT EXISTS gw_bible_annotations_owner_idx
  ON public.gw_bible_annotations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gw_bible_annotations_ref_idx
  ON public.gw_bible_annotations (user_id, translation_code, usfm_code, chapter);
CREATE INDEX IF NOT EXISTS gw_bible_annotations_tenant_idx
  ON public.gw_bible_annotations (tenant_id);

CREATE TABLE IF NOT EXISTS public.gw_bible_notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,

  translation_code text NOT NULL DEFAULT 'WEBCE',
  usfm_code        text NOT NULL,
  chapter          int  NOT NULL,
  -- NULL verse = a note on the whole chapter.
  verse            int,

  body             text NOT NULL DEFAULT '',

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_bible_notes_owner_idx
  ON public.gw_bible_notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gw_bible_notes_ref_idx
  ON public.gw_bible_notes (user_id, translation_code, usfm_code, chapter);
CREATE INDEX IF NOT EXISTS gw_bible_notes_tenant_idx
  ON public.gw_bible_notes (tenant_id);

-- ── tenant backfill + updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gw_bible_touch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_bible_annotations','gw_bible_notes'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_tenant_trg ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_tenant_trg BEFORE INSERT ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch_trg ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_touch_trg BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.gw_bible_touch()', t, t);
  END LOOP;
END $do$;

-- ── RLS: tenant isolation (RESTRICTIVE) + owner-only (PERMISSIVE) ────
ALTER TABLE public.gw_bible_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_bible_notes       ENABLE ROW LEVEL SECURITY;

DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_bible_annotations','gw_bible_notes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_isolation ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
       USING (tenant_id = public.current_tenant_id())
       WITH CHECK (tenant_id = public.current_tenant_id())', t, t);

    -- Owner-private by design, same precedent as Planner notes. There is no
    -- admin read policy on purpose: a director should not be able to read what
    -- a student underlined in scripture.
    EXECUTE format('DROP POLICY IF EXISTS %I_owner ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_owner ON public.%I FOR ALL TO authenticated
       USING (user_id = auth.uid())
       WITH CHECK (user_id = auth.uid())', t, t);
  END LOOP;
END $do$;

NOTIFY pgrst, 'reload schema';
