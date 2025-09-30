-- Allow anyone to view public sheet music
CREATE POLICY "Anyone can view public sheet music"
ON public.gw_sheet_music
FOR SELECT
TO public
USING (is_public = true AND is_archived = false);

-- Allow authenticated users to view their own sheet music
CREATE POLICY "Users can view their own sheet music"
ON public.gw_sheet_music
FOR SELECT
TO authenticated
USING (created_by = auth.uid());