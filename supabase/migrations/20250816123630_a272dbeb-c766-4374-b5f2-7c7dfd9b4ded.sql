-- Clean up duplicate/conflicting policies on gw_profiles
DROP POLICY IF EXISTS "Alumnae liaison profile update access" ON public.gw_profiles;
DROP POLICY IF EXISTS "Alumnae liaison profile view access" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users with auditions access can view auditioner profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.gw_profiles;

-- Fix any tables that might have missing policies or recursion issues
-- Add policies for tables that are referenced in network errors

-- Fix music_albums table policies
DROP POLICY IF EXISTS "music_albums_policy" ON public.music_albums;
CREATE POLICY "music_albums_public_access" 
ON public.music_albums 
FOR SELECT 
USING (true);

CREATE POLICY "music_albums_admin_manage" 
ON public.music_albums 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

-- Fix music_tracks table policies  
DROP POLICY IF EXISTS "music_tracks_policy" ON public.music_tracks;
CREATE POLICY "music_tracks_public_access" 
ON public.music_tracks 
FOR SELECT 
USING (true);

CREATE POLICY "music_tracks_admin_manage" 
ON public.music_tracks 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

-- Fix alumnae_audio_stories policies (remove circular reference)
DROP POLICY IF EXISTS "Admins can manage all audio stories" ON public.alumnae_audio_stories;
CREATE POLICY "alumnae_audio_stories_admin_manage" 
ON public.alumnae_audio_stories 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

-- Fix products table policies
DROP POLICY IF EXISTS "products_policy" ON public.products;
CREATE POLICY "products_public_access" 
ON public.products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "products_admin_manage" 
ON public.products 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));