-- Phase 2A: GleeLibrary Database Standardization and Security Cleanup

-- 1. Database Naming Standardization - Consolidate duplicate tables
-- Drop redundant sheet_music table in favor of gw_sheet_music
DROP TABLE IF EXISTS public.sheet_music CASCADE;
DROP TABLE IF EXISTS public.sheet_music_annotations CASCADE;
DROP TABLE IF EXISTS public.sheet_music_setlists CASCADE;
DROP TABLE IF EXISTS public.sheet_music_setlist_items CASCADE;
DROP TABLE IF EXISTS public.sheet_music_permissions CASCADE;
DROP TABLE IF EXISTS public.sheet_music_analytics CASCADE;

-- 2. Storage Security - Move to non-public buckets
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('sheet-music', 'user-files');

-- 3. Clean up redundant RLS policies
-- Remove duplicate/conflicting policies on gw_sheet_music
DROP POLICY IF EXISTS "Public can view public sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can insert sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can update their own sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can delete their own sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can view all sheet music" ON public.gw_sheet_music;

-- Create consolidated, secure RLS policies for gw_sheet_music
CREATE POLICY "Public can view public sheet music" 
ON public.gw_sheet_music 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Authenticated users can view accessible sheet music" 
ON public.gw_sheet_music 
FOR SELECT 
TO authenticated
USING (
  is_public = true OR 
  created_by = auth.uid() OR
  user_can_access_sheet_music(id, auth.uid())
);

CREATE POLICY "Creators and admins can manage sheet music" 
ON public.gw_sheet_music 
FOR ALL 
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- 4. Update storage policies for non-public access
DROP POLICY IF EXISTS "Sheet music files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload sheet music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update sheet music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete sheet music files" ON storage.objects;

-- Create role-based storage policies
CREATE POLICY "Authenticated users can view accessible sheet music files" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'sheet-music' AND (
    -- Check if user can access the sheet music
    EXISTS (
      SELECT 1 FROM public.gw_sheet_music sm
      WHERE sm.pdf_url = storage.objects.name 
      AND (
        sm.is_public = true OR 
        sm.created_by = auth.uid() OR
        user_can_access_sheet_music(sm.id, auth.uid())
      )
    )
  )
);

CREATE POLICY "Admins and creators can upload sheet music files" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'sheet-music' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

CREATE POLICY "Admins and creators can update sheet music files" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'sheet-music' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

CREATE POLICY "Admins and creators can delete sheet music files" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'sheet-music' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

-- 5. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_created_by ON public.gw_sheet_music(created_by);
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_tags ON public.gw_sheet_music USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_voice_parts ON public.gw_sheet_music USING GIN(voice_parts);
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_difficulty ON public.gw_sheet_music(difficulty_level);

-- 6. Add file naming standardization helper function
CREATE OR REPLACE FUNCTION public.generate_sheet_music_filename(
  p_title TEXT,
  p_composer TEXT DEFAULT NULL,
  p_voice_part TEXT DEFAULT NULL,
  p_version INTEGER DEFAULT 1
) RETURNS TEXT AS $$
DECLARE
  filename TEXT;
  clean_title TEXT;
  clean_composer TEXT;
  clean_voice_part TEXT;
BEGIN
  -- Clean and format title
  clean_title := REGEXP_REPLACE(LOWER(p_title), '[^a-z0-9]+', '_', 'g');
  clean_title := TRIM(clean_title, '_');
  
  -- Clean composer if provided
  IF p_composer IS NOT NULL THEN
    clean_composer := REGEXP_REPLACE(LOWER(p_composer), '[^a-z0-9]+', '_', 'g');
    clean_composer := TRIM(clean_composer, '_');
  END IF;
  
  -- Clean voice part if provided
  IF p_voice_part IS NOT NULL THEN
    clean_voice_part := REGEXP_REPLACE(LOWER(p_voice_part), '[^a-z0-9]+', '_', 'g');
    clean_voice_part := TRIM(clean_voice_part, '_');
  END IF;
  
  -- Build filename: YYYY_composer_title_voicepart_v1.pdf
  filename := EXTRACT(YEAR FROM NOW())::TEXT;
  
  IF clean_composer IS NOT NULL THEN
    filename := filename || '_' || clean_composer;
  END IF;
  
  filename := filename || '_' || clean_title;
  
  IF clean_voice_part IS NOT NULL THEN
    filename := filename || '_' || clean_voice_part;
  END IF;
  
  filename := filename || '_v' || p_version::TEXT || '.pdf';
  
  RETURN filename;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Add analytics consolidation function to avoid duplication
CREATE OR REPLACE FUNCTION public.log_sheet_music_action(
  p_sheet_music_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_page_number INTEGER DEFAULT NULL,
  p_session_duration INTEGER DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO public.gw_sheet_music_analytics (
    sheet_music_id,
    user_id, 
    action_type,
    page_number,
    session_duration,
    device_type,
    timestamp_recorded
  ) VALUES (
    p_sheet_music_id,
    p_user_id,
    p_action_type,
    p_page_number,
    p_session_duration,
    p_device_type,
    NOW()
  ) RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;