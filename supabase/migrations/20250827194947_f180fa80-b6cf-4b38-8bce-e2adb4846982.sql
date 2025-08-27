-- Fix sheet music access for members
-- First, ensure proper RLS policies for gw_sheet_music table

-- Drop conflicting policies
DROP POLICY IF EXISTS "Authenticated users can view public sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Public can view public sheet music" ON public.gw_sheet_music;

-- Create a comprehensive policy for members to access public sheet music
CREATE POLICY "Members can access public and permitted sheet music" 
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
    AND (is_admin = true OR is_super_admin = true OR role IN ('member', 'admin', 'super-admin'))
  )
);

-- Create policy for unauthenticated users to access public sheet music
CREATE POLICY "Public can view public sheet music" 
ON public.gw_sheet_music 
FOR SELECT 
TO public 
USING (is_public = true);

-- Create storage policies for sheet music access
-- Policy for viewing sheet music files
CREATE POLICY "Authenticated users can access sheet music files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'sheet-music' 
  AND (
    -- Check if the file is linked to public sheet music
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

-- Update the Stabat Mater entries to ensure they have proper URLs
UPDATE public.gw_sheet_music 
SET pdf_url = REPLACE(pdf_url, '/object/sign/', '/object/public/')
WHERE title LIKE '%Stabat Mater%' AND pdf_url LIKE '%/object/sign/%';

-- Create a function to help members access sheet music
CREATE OR REPLACE FUNCTION public.get_accessible_sheet_music(user_id_param uuid)
RETURNS TABLE(
  id uuid,
  title text,
  composer text,
  pdf_url text,
  is_public boolean,
  can_access boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    sm.id,
    sm.title,
    sm.composer,
    sm.pdf_url,
    sm.is_public,
    (
      sm.is_public = true 
      OR sm.created_by = user_id_param 
      OR user_can_access_sheet_music(sm.id, user_id_param)
      OR EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = user_id_param 
        AND (is_admin = true OR is_super_admin = true OR role IN ('member', 'admin', 'super-admin'))
      )
    ) as can_access
  FROM public.gw_sheet_music sm
  WHERE NOT sm.is_archived
  ORDER BY sm.title;
$$;