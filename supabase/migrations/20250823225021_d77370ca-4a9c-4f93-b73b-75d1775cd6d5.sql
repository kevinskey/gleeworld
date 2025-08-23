-- First, let's add voice_part column to gw_practice_links if it doesn't exist
-- and enhance the table for better voice part integration

-- Add voice_part column to practice links table (if not exists)
ALTER TABLE public.gw_practice_links 
ADD COLUMN IF NOT EXISTS voice_part text;

-- Add an index for better performance when filtering by voice part
CREATE INDEX IF NOT EXISTS idx_gw_practice_links_voice_part 
ON public.gw_practice_links(voice_part);

-- Create RLS policies for practice links

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Section leaders can create practice links" ON public.gw_practice_links;
DROP POLICY IF EXISTS "Section leaders can manage their practice links" ON public.gw_practice_links;
DROP POLICY IF EXISTS "Members can view practice links for their voice part" ON public.gw_practice_links;
DROP POLICY IF EXISTS "Admins can manage all practice links" ON public.gw_practice_links;

-- Section leaders can create practice links
CREATE POLICY "Section leaders can create practice links" 
ON public.gw_practice_links 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_section_leader = true OR is_admin = true OR is_super_admin = true)
  )
);

-- Section leaders can manage their own practice links
CREATE POLICY "Section leaders can manage their practice links" 
ON public.gw_practice_links 
FOR ALL 
USING (
  owner_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_section_leader = true OR is_admin = true OR is_super_admin = true)
  )
);

-- Members can view practice links for their voice part
CREATE POLICY "Members can view practice links for their voice part" 
ON public.gw_practice_links 
FOR SELECT 
USING (
  visibility = 'public' 
  OR (
    voice_part IS NULL 
    OR voice_part = (
      SELECT voice_part FROM public.gw_profiles 
      WHERE user_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Admins can manage all practice links
CREATE POLICY "Admins can manage all practice links" 
ON public.gw_practice_links 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Enable RLS on the table
ALTER TABLE public.gw_practice_links ENABLE ROW LEVEL SECURITY;