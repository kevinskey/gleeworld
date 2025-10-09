-- Fix RLS recursion on gw_sheet_music_annotations by removing collaborator-based policies
-- and replacing with a safe insert policy based on existing access function

-- Ensure RLS is enabled
ALTER TABLE public.gw_sheet_music_annotations ENABLE ROW LEVEL SECURITY;

-- Drop problematic collaborator policies that cause recursion
DROP POLICY IF EXISTS "Study score collaborators can insert annotations" ON public.gw_sheet_music_annotations;
DROP POLICY IF EXISTS "Study score collaborators can view annotations" ON public.gw_sheet_music_annotations;

-- Create safe insert policy leveraging existing access function
CREATE POLICY "Users can insert annotations on accessible music"
ON public.gw_sheet_music_annotations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.user_can_access_sheet_music(sheet_music_id, auth.uid())
);

-- Note: Existing policies kept
-- 1) "Users can manage their own annotations" (ALL) for updates/deletes
-- 2) "Users can view annotations on accessible sheet music" (SELECT) for reads
