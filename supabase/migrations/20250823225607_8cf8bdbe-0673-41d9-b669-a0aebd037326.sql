-- Create storage bucket for practice recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('practice-recordings', 'practice-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to prevent conflicts)
DROP POLICY IF EXISTS "Section leaders can upload practice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view practice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Section leaders can update their practice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Section leaders can delete their practice recordings" ON storage.objects;

-- Create RLS policies for practice-recordings bucket
CREATE POLICY "Section leaders can upload practice recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'practice-recordings' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_section_leader = true OR is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Everyone can view practice recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'practice-recordings');

CREATE POLICY "Section leaders can update their practice recordings"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'practice-recordings' 
  AND owner = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_section_leader = true OR is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Section leaders can delete their practice recordings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'practice-recordings' 
  AND owner = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_section_leader = true OR is_admin = true OR is_super_admin = true)
  )
);