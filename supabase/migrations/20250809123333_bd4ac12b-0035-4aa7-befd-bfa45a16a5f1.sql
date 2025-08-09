-- Create collections tables with RLS and seed categories

-- 1) Collections table
CREATE TABLE IF NOT EXISTS public.gw_music_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  is_system boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Collection items
CREATE TABLE IF NOT EXISTS public.gw_music_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.gw_music_collections(id) ON DELETE CASCADE,
  sheet_music_id uuid NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, sheet_music_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_owner ON public.gw_music_collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON public.gw_music_collection_items(collection_id);

-- Updated_at triggers (assumes update_updated_at_column_v2 exists)
DROP TRIGGER IF EXISTS trg_collections_updated ON public.gw_music_collections;
CREATE TRIGGER trg_collections_updated
BEFORE UPDATE ON public.gw_music_collections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();

DROP TRIGGER IF EXISTS trg_collection_items_updated ON public.gw_music_collection_items;
CREATE TRIGGER trg_collection_items_updated
BEFORE UPDATE ON public.gw_music_collection_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();

-- Enable RLS
ALTER TABLE public.gw_music_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_music_collection_items ENABLE ROW LEVEL SECURITY;

-- Policies for collections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collections' AND policyname='Collections select public or own'
  ) THEN
    CREATE POLICY "Collections select public or own"
    ON public.gw_music_collections
    FOR SELECT TO authenticated
    USING (is_public = true OR owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collections' AND policyname='Collections insert own'
  ) THEN
    CREATE POLICY "Collections insert own"
    ON public.gw_music_collections
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collections' AND policyname='Collections update own'
  ) THEN
    CREATE POLICY "Collections update own"
    ON public.gw_music_collections
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collections' AND policyname='Collections delete own'
  ) THEN
    CREATE POLICY "Collections delete own"
    ON public.gw_music_collections
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());
  END IF;
END$$;

-- Policies for items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collection_items' AND policyname='Items select visible'
  ) THEN
    CREATE POLICY "Items select visible"
    ON public.gw_music_collection_items
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_music_collections c
        WHERE c.id = gw_music_collection_items.collection_id
          AND (c.is_public = true OR c.owner_id = auth.uid())
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collection_items' AND policyname='Items insert own collections'
  ) THEN
    CREATE POLICY "Items insert own collections"
    ON public.gw_music_collection_items
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.gw_music_collections c
        WHERE c.id = collection_id AND c.owner_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collection_items' AND policyname='Items update own collections'
  ) THEN
    CREATE POLICY "Items update own collections"
    ON public.gw_music_collection_items
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_music_collections c
        WHERE c.id = gw_music_collection_items.collection_id AND c.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.gw_music_collections c
        WHERE c.id = collection_id AND c.owner_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_music_collection_items' AND policyname='Items delete own collections'
  ) THEN
    CREATE POLICY "Items delete own collections"
    ON public.gw_music_collection_items
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_music_collections c
        WHERE c.id = gw_music_collection_items.collection_id AND c.owner_id = auth.uid()
      )
    );
  END IF;
END$$;

-- 3) Seed system collections
INSERT INTO public.gw_music_collections (title, category, is_system, is_public, owner_id)
VALUES
  ('African American Collection', 'African American Collection', true, true, NULL),
  ('Kevin Phillip Johnson Collection', 'Kevin Phillip Johnson Collection', true, true, NULL),
  ('Negro Spirituals', 'Negro Spirituals', true, true, NULL),
  ('Acappella Favorites', 'Acappella Favorites', true, true, NULL)
ON CONFLICT DO NOTHING;