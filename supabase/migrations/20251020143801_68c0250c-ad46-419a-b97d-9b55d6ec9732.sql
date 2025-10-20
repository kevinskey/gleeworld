-- Ensure RLS is enabled and allow viewing active dashboard hero slides
DO $$ BEGIN
  PERFORM 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dashboard_hero_slides';
  -- Enable RLS (safe if already enabled)
  EXECUTE 'ALTER TABLE public.dashboard_hero_slides ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN
  -- table might not exist in some environments; ignore
  NULL;
END $$;

-- Create or replace a SELECT policy for active slides visible to everyone (no PII)
DROP POLICY IF EXISTS "Public can view active dashboard slides" ON public.dashboard_hero_slides;
CREATE POLICY "Public can view active dashboard slides"
ON public.dashboard_hero_slides
FOR SELECT
USING (is_active = true);
