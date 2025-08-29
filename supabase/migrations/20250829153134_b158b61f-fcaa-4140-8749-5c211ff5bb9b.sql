-- Fix mus240-resources bucket and ensure proper configuration
-- First ensure the bucket exists with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mus240-resources', 'mus240-resources', true, 52428800, ARRAY[
  'application/pdf', 
  'application/vnd.ms-powerpoint', 
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'text/plain'
])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure RLS is enabled on mus240_resources table
ALTER TABLE public.mus240_resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for mus240_resources table
DROP POLICY IF EXISTS "MUS240 Resources - Public Read" ON public.mus240_resources;
DROP POLICY IF EXISTS "MUS240 Resources - Admin Manage" ON public.mus240_resources;

-- Create RLS policies for mus240_resources table
CREATE POLICY "MUS240 Resources - Public Read"
ON public.mus240_resources FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "MUS240 Resources - Admin Manage"
ON public.mus240_resources FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);