-- Simple fix for infinite recursion and RLS issues
-- Remove all problematic policies and create simple ones

-- Drop all policies on problematic tables to stop infinite recursion
DROP POLICY IF EXISTS "Admins can manage audio archive" ON public.audio_archive;
DROP POLICY IF EXISTS "Everyone can view public audio archive" ON public.audio_archive;
DROP POLICY IF EXISTS "Verified alumnae can view all audio archive" ON public.audio_archive;

DROP POLICY IF EXISTS "Everyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

DROP POLICY IF EXISTS "Everyone can view public events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

DROP POLICY IF EXISTS "Everyone can view public events" ON public.gw_events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.gw_events;

-- Drop storage policies that might be problematic
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;

-- Create simple, non-recursive storage policies
CREATE POLICY "Authenticated can upload files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view files" ON storage.objects
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can update files" ON storage.objects
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete files" ON storage.objects
FOR DELETE TO authenticated USING (true);

-- Simple policies for audio_archive
CREATE POLICY "Anyone can view public audio" ON public.audio_archive
FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated can manage audio" ON public.audio_archive
FOR ALL USING (auth.uid() IS NOT NULL);

-- Simple policies for products
CREATE POLICY "Anyone can view active products" ON public.products
FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated can manage products" ON public.products
FOR ALL USING (auth.uid() IS NOT NULL);

-- Ensure gw_radio_stats table exists
CREATE TABLE IF NOT EXISTS public.gw_radio_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    total_listeners integer DEFAULT 0,
    current_listeners integer DEFAULT 0,
    peak_listeners integer DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and create simple policy
ALTER TABLE public.gw_radio_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view radio stats" ON public.gw_radio_stats
FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage radio stats" ON public.gw_radio_stats
FOR ALL USING (auth.uid() IS NOT NULL);

-- Fix gw_profiles policies - keep it simple
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;

CREATE POLICY "Users can view their own profile" ON public.gw_profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.gw_profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.gw_profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Simple policies for events
CREATE POLICY "Anyone can view public events" ON public.events
FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated can manage events" ON public.events
FOR ALL USING (auth.uid() IS NOT NULL);

-- Simple policies for gw_events
CREATE POLICY "Anyone can view public gw_events" ON public.gw_events
FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated can manage gw_events" ON public.gw_events
FOR ALL USING (auth.uid() IS NOT NULL);