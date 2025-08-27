-- Fix sheet music access for members - corrected approach
-- Drop all existing sheet music policies first to avoid conflicts

DROP POLICY IF EXISTS "Members can access public and permitted sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can view accessible sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Creators and admins can manage sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Public can view public sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can access sheet music files" ON storage.objects;

-- Create comprehensive sheet music access policies
CREATE POLICY "Public can view public sheet music" 
ON public.gw_sheet_music 
FOR SELECT 
TO public 
USING (is_public = true);

CREATE POLICY "Members can access sheet music" 
ON public.gw_sheet_music 
FOR SELECT 
TO authenticated 
USING (
  is_public = true 
  OR created_by = auth.uid() 
  OR user_can_access_sheet_music(id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('member', 'admin', 'super-admin', 'alumna', 'fan'))
  )
);

CREATE POLICY "Admins can manage sheet music" 
ON public.gw_sheet_music 
FOR ALL 
TO authenticated 
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create storage policy for sheet music files access
CREATE POLICY "Sheet music file access" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'sheet-music' 
  AND (
    -- Check if user has access to the sheet music that uses this file
    EXISTS (
      SELECT 1 FROM public.gw_sheet_music sm 
      WHERE sm.pdf_url LIKE '%' || name || '%' 
      AND (
        sm.is_public = true 
        OR sm.created_by = auth.uid()
        OR user_can_access_sheet_music(sm.id, auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.gw_profiles 
          WHERE user_id = auth.uid() 
          AND (is_admin = true OR is_super_admin = true OR role IN ('member', 'admin', 'super-admin'))
        )
      )
    )
  )
);

-- Ensure Stabat Mater files use public URLs
UPDATE public.gw_sheet_music 
SET pdf_url = REPLACE(pdf_url, '/object/sign/', '/object/public/')
WHERE title LIKE '%Stabat Mater%' AND pdf_url LIKE '%/object/sign/%';