-- Check if gw_study_scores table exists first, and create it if needed
CREATE TABLE IF NOT EXISTS public.gw_study_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  composer text,
  file_url text,
  file_path text,
  voice_part text,
  difficulty_level text DEFAULT 'beginner',
  tags text[] DEFAULT '{}',
  is_public boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.gw_study_scores ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to break recursion
DO $$ 
DECLARE 
  pol_name TEXT;
BEGIN
  FOR pol_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'gw_study_scores' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.gw_study_scores', pol_name);
  END LOOP;
END $$;

-- Create simple, non-recursive policies
-- Allow all authenticated users to view study scores
CREATE POLICY "authenticated_users_can_view_study_scores"
ON public.gw_study_scores
FOR SELECT
TO authenticated
USING (true);

-- Allow users to create study scores if they exist in gw_profiles
CREATE POLICY "users_can_create_study_scores"
ON public.gw_study_scores
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND
  check_user_exists_simple()
);

-- Allow admins to manage all study scores using simple admin check
CREATE POLICY "admins_can_manage_study_scores"
ON public.gw_study_scores
FOR ALL
TO authenticated
USING (check_user_admin_simple())
WITH CHECK (check_user_admin_simple());