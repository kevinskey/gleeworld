-- Fix authentication issues for MUS240 class
-- This addresses the RLS policy issues and ensures proper access

-- Enable RLS on auth-related tables that need policies
ALTER TABLE public.mus240_enrollments ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for student authentication and enrollment
CREATE POLICY "Students can view their own enrollment" 
ON public.mus240_enrollments 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Allow enrollment creation for authenticated users" 
ON public.mus240_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own enrollment" 
ON public.mus240_enrollments 
FOR UPDATE 
USING (auth.uid() = student_id);

-- Ensure MUS240 polls can be viewed by enrolled students
CREATE POLICY "Enrolled students can view active polls" 
ON public.mus240_polls 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
  )
);

-- Allow instructors/admins to manage polls
CREATE POLICY "Instructors can manage polls" 
ON public.mus240_polls 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Ensure students can submit poll responses
CREATE POLICY "Enrolled students can submit poll responses" 
ON public.mus240_poll_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() = student_id 
  AND EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
  )
);

CREATE POLICY "Students can view their own responses" 
ON public.mus240_poll_responses 
FOR SELECT 
USING (auth.uid() = student_id);

-- Fix any missing RLS policies for user profiles that students need
CREATE POLICY "Allow users to view their own profile" 
ON public.gw_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own profile" 
ON public.gw_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Ensure new users can create their profile
CREATE POLICY "Allow authenticated users to create profile" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a function to auto-create user profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.gw_profiles (user_id, email, full_name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'student',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a function to enroll students in MUS240 when they sign up
CREATE OR REPLACE FUNCTION public.auto_enroll_mus240()
RETURNS trigger AS $$
BEGIN
  -- Auto-enroll new students in current semester
  INSERT INTO public.mus240_enrollments (student_id, semester, enrollment_status, enrolled_at)
  VALUES (
    new.user_id,
    'Fall 2024', -- Update this to current semester
    'enrolled',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-enrollment
DROP TRIGGER IF EXISTS auto_enroll_mus240_trigger ON public.gw_profiles;
CREATE TRIGGER auto_enroll_mus240_trigger
  AFTER INSERT ON public.gw_profiles
  FOR EACH ROW 
  WHEN (NEW.role = 'student')
  EXECUTE FUNCTION public.auto_enroll_mus240();