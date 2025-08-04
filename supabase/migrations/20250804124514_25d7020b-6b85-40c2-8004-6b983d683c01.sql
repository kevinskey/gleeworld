-- Complete fix for infinite recursion - remove ALL problematic policies and rebuild

-- Step 1: Disable RLS on all affected tables temporarily
ALTER TABLE gw_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE gw_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE audio_archive DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that could cause recursion
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on gw_profiles
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'gw_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON gw_profiles';
    END LOOP;
    
    -- Drop all policies on gw_events
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'gw_events' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON gw_events';
    END LOOP;
    
    -- Drop all policies on products
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON products';
    END LOOP;
    
    -- Drop all policies on audio_archive
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'audio_archive' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON audio_archive';
    END LOOP;
    
    -- Drop all storage policies
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Step 3: Create simple security definer functions (no recursion possible)
CREATE OR REPLACE FUNCTION public.check_user_admin_simple()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) OR COALESCE(is_super_admin, false)
  FROM gw_profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_user_exists_simple()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Step 4: Re-enable RLS and create simple policies
ALTER TABLE gw_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_archive ENABLE ROW LEVEL SECURITY;

-- Simple gw_profiles policies
CREATE POLICY "profiles_select_own" ON gw_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "profiles_insert_own" ON gw_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update_own" ON gw_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Simple gw_events policies
CREATE POLICY "events_select_public" ON gw_events FOR SELECT USING (is_public = true OR check_user_admin_simple());
CREATE POLICY "events_insert_auth" ON gw_events FOR INSERT TO authenticated WITH CHECK (check_user_exists_simple());
CREATE POLICY "events_update_auth" ON gw_events FOR UPDATE TO authenticated USING (check_user_admin_simple() OR created_by = auth.uid());
CREATE POLICY "events_delete_auth" ON gw_events FOR DELETE TO authenticated USING (check_user_admin_simple() OR created_by = auth.uid());

-- Simple products policies
CREATE POLICY "products_select_public" ON products FOR SELECT USING (is_active = true OR check_user_admin_simple());
CREATE POLICY "products_manage_admin" ON products FOR ALL TO authenticated USING (check_user_admin_simple());

-- Simple audio_archive policies
CREATE POLICY "audio_select_public" ON audio_archive FOR SELECT USING (is_public = true OR check_user_admin_simple());
CREATE POLICY "audio_manage_admin" ON audio_archive FOR ALL TO authenticated USING (check_user_admin_simple());

-- Simple storage policies
CREATE POLICY "storage_select_all" ON storage.objects FOR SELECT TO authenticated USING (true);
CREATE POLICY "storage_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user-files');
CREATE POLICY "storage_update_auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'user-files');
CREATE POLICY "storage_delete_auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'user-files');

-- Ensure gw_radio_stats table exists and has simple policies
CREATE TABLE IF NOT EXISTS public.gw_radio_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_listeners integer DEFAULT 0,
    total_plays integer DEFAULT 0,
    current_track_id uuid,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE gw_radio_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "radio_stats_select_all" ON gw_radio_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "radio_stats_insert_auth" ON gw_radio_stats FOR INSERT TO authenticated WITH CHECK (true);