-- Create storage bucket for practice recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('practice-recordings', 'practice-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for practice-recordings bucket
CREATE POLICY IF NOT EXISTS "Section leaders can upload practice recordings"
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

CREATE POLICY IF NOT EXISTS "Everyone can view practice recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'practice-recordings');

CREATE POLICY IF NOT EXISTS "Section leaders can update their practice recordings"
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

CREATE POLICY IF NOT EXISTS "Section leaders can delete their practice recordings"
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