-- Update bowman_scholars table with new fields
ALTER TABLE public.bowman_scholars 
ADD COLUMN full_name TEXT,
ADD COLUMN hometown TEXT,
ADD COLUMN resume_url TEXT,
ADD COLUMN ministry_statement TEXT;

-- Update RLS policies to ensure only authenticated users can register
DROP POLICY IF EXISTS "bs_write_self" ON public.bowman_scholars;
DROP POLICY IF EXISTS "bs_write_self_upd" ON public.bowman_scholars;
DROP POLICY IF EXISTS "scholars_self_write" ON public.bowman_scholars;
DROP POLICY IF EXISTS "scholars_self_update" ON public.bowman_scholars;

-- Create new policies requiring authentication
CREATE POLICY "authenticated_users_can_create_profile" 
ON public.bowman_scholars 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "users_can_update_own_profile" 
ON public.bowman_scholars 
FOR UPDATE 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Create storage bucket for Bowman Scholar files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bowman-scholars', 'bowman-scholars', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for bowman-scholars bucket
CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'bowman-scholars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'bowman-scholars' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

CREATE POLICY "Public can view approved scholar files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'bowman-scholars');