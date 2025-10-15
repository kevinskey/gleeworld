-- Ensure RLS is enabled on relevant tables
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_sheet_music ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view public setlists (idempotent-ish: create with unique name)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'setlists' AND policyname = 'Public can view public setlists'
  ) THEN
    CREATE POLICY "Public can view public setlists"
    ON public.setlists
    FOR SELECT
    USING (is_public = true);
  END IF;
END $$;

-- Allow admins & librarians to view all setlists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'setlists' AND policyname = 'Admins and librarians can view all setlists'
  ) THEN
    CREATE POLICY "Admins and librarians can view all setlists"
    ON public.setlists
    FOR SELECT
    USING (public.is_admin_or_librarian(auth.uid()));
  END IF;
END $$;

-- Allow creator to view/manage their own setlists (view in case setlist is not public)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'setlists' AND policyname = 'Creators can manage their setlists'
  ) THEN
    CREATE POLICY "Creators can manage their setlists"
    ON public.setlists
    FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

-- Allow anyone to view items that belong to public setlists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'setlist_items' AND policyname = 'Public can view items of public setlists'
  ) THEN
    CREATE POLICY "Public can view items of public setlists"
    ON public.setlist_items
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.setlists s 
        WHERE s.id = setlist_items.setlist_id 
          AND s.is_public = true
      )
    );
  END IF;
END $$;

-- Allow admins & librarians to view all setlist items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'setlist_items' AND policyname = 'Admins and librarians can view all setlist items'
  ) THEN
    CREATE POLICY "Admins and librarians can view all setlist items"
    ON public.setlist_items
    FOR SELECT
    USING (public.is_admin_or_librarian(auth.uid()));
  END IF;
END $$;

-- Allow creators to manage items of their setlists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'setlist_items' AND policyname = 'Creators can manage items of their setlists'
  ) THEN
    CREATE POLICY "Creators can manage items of their setlists"
    ON public.setlist_items
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.setlists s 
        WHERE s.id = setlist_items.setlist_id 
          AND s.created_by = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.setlists s 
        WHERE s.id = setlist_items.setlist_id 
          AND s.created_by = auth.uid()
      )
    );
  END IF;
END $$;

-- Allow anyone to view public sheet music (for titles/composers/pdfs referenced by public setlists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gw_sheet_music' AND policyname = 'Public can view public sheet music'
  ) THEN
    CREATE POLICY "Public can view public sheet music"
    ON public.gw_sheet_music
    FOR SELECT
    USING (is_public = true);
  END IF;
END $$;

-- Allow admins & librarians to view all sheet music
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gw_sheet_music' AND policyname = 'Admins and librarians can view all sheet music'
  ) THEN
    CREATE POLICY "Admins and librarians can view all sheet music"
    ON public.gw_sheet_music
    FOR SELECT
    USING (public.is_admin_or_librarian(auth.uid()));
  END IF;
END $$;
