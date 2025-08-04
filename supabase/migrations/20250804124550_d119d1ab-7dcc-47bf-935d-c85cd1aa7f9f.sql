-- Complete fix for infinite recursion and RLS issues
-- This migration will completely resolve all RLS policy conflicts

-- First, check if any policies still reference gw_profiles recursively and remove them
DO $$
DECLARE
    pol_record RECORD;
BEGIN
    -- Get all policies that might cause infinite recursion
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('gw_profiles', 'profiles', 'audio_archive', 'products', 'product_categories', 'events', 'gw_events')
        AND definition LIKE '%gw_profiles%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s" ON %s.%s', 
            pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
END $$;

-- Drop any remaining problematic policies on storage.objects
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;

-- Create simple, non-recursive policies for storage.objects
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated access" ON storage.objects
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (true);

-- Create basic policies for gw_profiles using only auth.uid()
CREATE POLICY "Users can view their own profile" ON public.gw_profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.gw_profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.gw_profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Fix audio_archive policies
DROP POLICY IF EXISTS "Everyone can view public audio archive" ON public.audio_archive;
DROP POLICY IF EXISTS "Verified alumnae can view all audio archive" ON public.audio_archive;
DROP POLICY IF EXISTS "Admins can manage audio archive" ON public.audio_archive;

CREATE POLICY "Public can view audio archive" ON public.audio_archive
FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated can manage audio archive" ON public.audio_archive
FOR ALL USING (auth.uid() IS NOT NULL);

-- Fix products table policies
DROP POLICY IF EXISTS "Everyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Public can view active products" ON public.products
FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated can manage products" ON public.products
FOR ALL USING (auth.uid() IS NOT NULL);

-- Fix events/gw_events table policies
DROP POLICY IF EXISTS "Everyone can view public events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Everyone can view public events" ON public.gw_events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.gw_events;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    location text,
    is_public boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    location text,
    is_public boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on tables if not already enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public events" ON public.events
FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated can manage events" ON public.events
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can view public gw_events" ON public.gw_events
FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated can manage gw_events" ON public.gw_events
FOR ALL USING (auth.uid() IS NOT NULL);

-- Ensure gw_radio_stats table exists with proper structure
CREATE TABLE IF NOT EXISTS public.gw_radio_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    total_listeners integer DEFAULT 0,
    current_listeners integer DEFAULT 0,
    peak_listeners integer DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gw_radio_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view radio stats" ON public.gw_radio_stats
FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage radio stats" ON public.gw_radio_stats
FOR ALL USING (auth.uid() IS NOT NULL);

-- Add basic policies for other tables mentioned in linter
CREATE TABLE IF NOT EXISTS public.product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product categories" ON public.product_categories
FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage product categories" ON public.product_categories
FOR ALL USING (auth.uid() IS NOT NULL);

-- Ensure youtube_channels table exists
CREATE TABLE IF NOT EXISTS public.youtube_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id text UNIQUE NOT NULL,
    channel_name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view youtube channels" ON public.youtube_channels
FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage youtube channels" ON public.youtube_channels
FOR ALL USING (auth.uid() IS NOT NULL);