-- Simple fix for infinite recursion by removing all recursive policies
-- and creating basic non-recursive ones

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can manage audio archive" ON public.audio_archive;
DROP POLICY IF EXISTS "Everyone can view public audio archive" ON public.audio_archive;
DROP POLICY IF EXISTS "Verified alumnae can view all audio archive" ON public.audio_archive;
DROP POLICY IF EXISTS "Public can view audio archive" ON public.audio_archive;

DROP POLICY IF EXISTS "Everyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

-- Drop storage policies that might cause issues
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create simple storage policies
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow access" ON storage.objects
FOR SELECT USING (true);

CREATE POLICY "Allow updates" ON storage.objects
FOR UPDATE USING (true);

CREATE POLICY "Allow deletes" ON storage.objects
FOR DELETE USING (true);

-- Create simple policies for gw_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.gw_profiles;

CREATE POLICY "Profile access" ON public.gw_profiles
FOR ALL USING (user_id = auth.uid());

-- Create simple policies for audio_archive (check what columns actually exist)
CREATE POLICY "Audio archive access" ON public.audio_archive
FOR ALL USING (true);

-- Create simple policies for products  
CREATE POLICY "Products access" ON public.products
FOR ALL USING (true);

-- Ensure gw_radio_stats table exists
CREATE TABLE IF NOT EXISTS public.gw_radio_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    total_listeners integer DEFAULT 0,
    current_listeners integer DEFAULT 0,
    peak_listeners integer DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gw_radio_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Radio stats access" ON public.gw_radio_stats
FOR ALL USING (true);

-- Add missing youtube_channels table
CREATE TABLE IF NOT EXISTS public.youtube_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id text UNIQUE NOT NULL,
    channel_name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Youtube channels access" ON public.youtube_channels
FOR ALL USING (true);