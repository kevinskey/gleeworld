-- Allow anonymous users to view public sheet music for class use
CREATE POLICY "Public users can view public sheet music"
ON gw_sheet_music
FOR SELECT
TO anon
USING (is_public = true AND is_archived = false);