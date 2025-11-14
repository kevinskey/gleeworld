-- Enable RLS for journals and peer reviews (safe if already enabled)
ALTER TABLE IF EXISTS public.mus240_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mus240_peer_reviews ENABLE ROW LEVEL SECURITY;

-- Allow users to view published journal entries by others (in addition to any existing policies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'mus240_journal_entries' 
      AND policyname = 'select_published_entries_by_others'
  ) THEN
    CREATE POLICY "select_published_entries_by_others"
    ON public.mus240_journal_entries
    FOR SELECT
    USING (is_published = true AND auth.uid() <> student_id);
  END IF;
END $$;

-- Allow users to read peer review rows when:
-- 1) They are the reviewer (needed to mark has_reviewed)
-- 2) The review belongs to a published journal by someone else (needed to compute counts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'mus240_peer_reviews' 
      AND policyname = 'select_reviews_for_published_or_self'
  ) THEN
    CREATE POLICY "select_reviews_for_published_or_self"
    ON public.mus240_peer_reviews
    FOR SELECT
    USING (
      reviewer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.mus240_journal_entries e
        WHERE e.id = public.mus240_peer_reviews.journal_id
          AND e.is_published = true
          AND e.student_id <> auth.uid()
      )
    );
  END IF;
END $$;
