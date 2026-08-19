-- Prayer module — scripture text.
--
-- PLATFORM REFERENCE DATA, no tenant_id: the text of the Bible is the same
-- for every tenant. ~31k verses per 66-book translation (WEBCE adds the
-- deuterocanon, so ~35-37k), a handful of translations well under 100 MB.
--
-- Word-concordance search is a generated tsvector + GIN index, so there is no
-- external search service and no new CSP connect-src host. Storing scripture
-- locally rather than proxying a third-party Bible API is deliberate: it keeps
-- the reader working offline in the iOS shell and avoids a runtime dependency.

CREATE TABLE IF NOT EXISTS public.gw_bible_translations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,          -- 'WEBCE', 'DRA', 'KJV'
  name             text NOT NULL,
  language         text NOT NULL DEFAULT 'en',
  is_public_domain boolean NOT NULL DEFAULT true,
  has_deuterocanon boolean NOT NULL DEFAULT false,
  -- Shown in the reader. "World English Bible" is a trademark of eBible.org,
  -- so this names the translation without implying endorsement.
  attribution      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_bible_books (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id uuid NOT NULL
                   REFERENCES public.gw_bible_translations(id) ON DELETE CASCADE,
  usfm_code      text NOT NULL,                   -- 'GEN', 'TOB', 'MAT'
  name           text NOT NULL,
  canon_order    int  NOT NULL,
  -- DC = deuterocanonical. Kept distinct from OT so a non-Catholic rite can
  -- filter it out without needing a per-book allow-list.
  testament      text NOT NULL CHECK (testament IN ('OT','NT','DC'))
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_bible_books_translation_usfm_uidx
  ON public.gw_bible_books (translation_id, usfm_code);

CREATE INDEX IF NOT EXISTS gw_bible_books_translation_order_idx
  ON public.gw_bible_books (translation_id, canon_order);

CREATE TABLE IF NOT EXISTS public.gw_bible_verses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    uuid NOT NULL REFERENCES public.gw_bible_books(id) ON DELETE CASCADE,
  chapter    int  NOT NULL,
  verse      int  NOT NULL,
  text       text NOT NULL,
  search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_bible_verses_ref_uidx
  ON public.gw_bible_verses (book_id, chapter, verse);

CREATE INDEX IF NOT EXISTS gw_bible_verses_search_idx
  ON public.gw_bible_verses USING GIN (search_tsv);

ALTER TABLE public.gw_bible_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_bible_books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_bible_verses       ENABLE ROW LEVEL SECURITY;

CREATE POLICY gw_bible_translations_read ON public.gw_bible_translations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gw_bible_books_read ON public.gw_bible_books
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gw_bible_verses_read ON public.gw_bible_verses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY gw_bible_translations_admin_write ON public.gw_bible_translations
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());
CREATE POLICY gw_bible_books_admin_write ON public.gw_bible_books
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());
CREATE POLICY gw_bible_verses_admin_write ON public.gw_bible_verses
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());

NOTIFY pgrst, 'reload schema';
