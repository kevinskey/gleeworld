-- Create practice links table to hold per-piece links with visibility controls
CREATE TABLE IF NOT EXISTS public.gw_practice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal','section','global')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  target_section TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_practice_links ENABLE ROW LEVEL SECURITY;

-- Timestamps trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_gw_practice_links_updated_at'
  ) THEN
    CREATE TRIGGER update_gw_practice_links_updated_at
    BEFORE UPDATE ON public.gw_practice_links
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();
  END IF;
END $$;

-- SELECT policies
CREATE POLICY IF NOT EXISTS "Users can view their own personal links"
ON public.gw_practice_links
FOR SELECT
USING (
  visibility = 'personal' AND owner_id = auth.uid()
);

CREATE POLICY IF NOT EXISTS "Users can view global practice links"
ON public.gw_practice_links
FOR SELECT
USING (
  visibility = 'global' AND public.user_can_access_sheet_music(music_id, auth.uid())
);

CREATE POLICY IF NOT EXISTS "Users can view section practice links"
ON public.gw_practice_links
FOR SELECT
USING (
  visibility = 'section'
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND p.voice_part = target_section
  )
);

-- Allow creators to see their own links regardless of visibility
CREATE POLICY IF NOT EXISTS "Creators can view their created links"
ON public.gw_practice_links
FOR SELECT
USING (owner_id = auth.uid());

-- INSERT policies
CREATE POLICY IF NOT EXISTS "Users can create personal practice links"
ON public.gw_practice_links
FOR INSERT
WITH CHECK (
  owner_id = auth.uid() AND visibility = 'personal'
);

CREATE POLICY IF NOT EXISTS "Section leaders/admins can create section links"
ON public.gw_practice_links
FOR INSERT
WITH CHECK (
  visibility = 'section'
  AND owner_id = auth.uid()
  AND target_section IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (
      p.role = 'section_leader' OR p.is_admin = true OR p.is_super_admin = true
    )
  )
);

CREATE POLICY IF NOT EXISTS "Leaders/admins can create global links"
ON public.gw_practice_links
FOR INSERT
WITH CHECK (
  visibility = 'global'
  AND owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (
      p.is_admin = true OR p.is_super_admin = true OR p.role IN ('section_leader','admin','super-admin')
    )
  )
);

-- UPDATE policies (owners can update their own)
CREATE POLICY IF NOT EXISTS "Owners can update their practice links"
ON public.gw_practice_links
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE policies (owners can delete their own)
CREATE POLICY IF NOT EXISTS "Owners can delete their practice links"
ON public.gw_practice_links
FOR DELETE
USING (owner_id = auth.uid());