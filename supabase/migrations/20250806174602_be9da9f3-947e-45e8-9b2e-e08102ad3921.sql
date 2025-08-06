-- Migration: Transition auditioners to auditioner role and sync application data
-- This migration will:
-- 1. Update existing audition applicants to have "auditioner" role
-- 2. Sync application data to user profiles
-- 3. Ensure data consistency for the auditioner workflow

-- First, let's update the role validation in any functions that might restrict roles
-- Update existing profiles for users who have audition applications to "auditioner" role
UPDATE public.gw_profiles 
SET 
  role = 'auditioner',
  updated_at = now()
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.audition_applications 
  WHERE status IN ('submitted', 'pending', 'under_review')
)
AND role NOT IN ('admin', 'super-admin'); -- Don't change admin roles

-- Sync application data to profiles where missing
-- Update full names from applications
UPDATE public.gw_profiles 
SET 
  full_name = COALESCE(gw_profiles.full_name, aa.full_name),
  email = COALESCE(gw_profiles.email, aa.email),
  updated_at = now()
FROM public.audition_applications aa
WHERE gw_profiles.user_id = aa.user_id
AND (gw_profiles.full_name IS NULL OR gw_profiles.email IS NULL);

-- Add additional profile fields from application data if columns exist
-- First check if we need to add any columns to gw_profiles for auditioner data
DO $$
BEGIN
  -- Add academic_year if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' AND column_name = 'academic_year') THEN
    ALTER TABLE public.gw_profiles ADD COLUMN academic_year TEXT;
  END IF;
  
  -- Add major if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' AND column_name = 'major') THEN
    ALTER TABLE public.gw_profiles ADD COLUMN major TEXT;
  END IF;
  
  -- Add minor if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' AND column_name = 'minor') THEN
    ALTER TABLE public.gw_profiles ADD COLUMN minor TEXT;
  END IF;
  
  -- Add voice_part_preference if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' AND column_name = 'voice_part_preference') THEN
    ALTER TABLE public.gw_profiles ADD COLUMN voice_part_preference TEXT;
  END IF;
  
  -- Add gpa if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' AND column_name = 'gpa') THEN
    ALTER TABLE public.gw_profiles ADD COLUMN gpa NUMERIC(3,2);
  END IF;
  
  -- Add phone_number if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' AND column_name = 'phone_number') THEN
    ALTER TABLE public.gw_profiles ADD COLUMN phone_number TEXT;
  END IF;
  
  -- Add student_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' AND column_name = 'student_id') THEN
    ALTER TABLE public.gw_profiles ADD COLUMN student_id TEXT;
  END IF;
END
$$;

-- Now sync the application data to profiles
UPDATE public.gw_profiles 
SET 
  academic_year = COALESCE(gw_profiles.academic_year, aa.academic_year),
  major = COALESCE(gw_profiles.major, aa.major),
  minor = COALESCE(gw_profiles.minor, aa.minor),
  voice_part_preference = COALESCE(gw_profiles.voice_part_preference, aa.voice_part_preference),
  gpa = COALESCE(gw_profiles.gpa, aa.gpa),
  phone_number = COALESCE(gw_profiles.phone_number, aa.phone_number),
  student_id = COALESCE(gw_profiles.student_id, aa.student_id),
  updated_at = now()
FROM public.audition_applications aa
WHERE gw_profiles.user_id = aa.user_id;

-- Update the secure_update_user_role function to include 'auditioner' role
CREATE OR REPLACE FUNCTION public.secure_update_user_role(target_user_id uuid, new_role text, reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_role text;
    old_role text;
    admin_user_id uuid;
BEGIN
    -- Get current user making the change
    admin_user_id := auth.uid();
    
    -- Check if current user is admin or super-admin
    SELECT role INTO current_user_role 
    FROM public.gw_profiles 
    WHERE user_id = admin_user_id;
    
    IF current_user_role NOT IN ('admin', 'super-admin') THEN
        RAISE EXCEPTION 'Permission denied: Only admins can update user roles';
    END IF;
    
    -- Prevent self-role changes (critical security check)
    IF target_user_id = admin_user_id THEN
        RAISE EXCEPTION 'Security violation: Cannot modify your own role';
    END IF;
    
    -- Only super-admins can assign super-admin role
    IF new_role = 'super-admin' AND current_user_role != 'super-admin' THEN
        RAISE EXCEPTION 'Permission denied: Only super-admins can assign super-admin role';
    END IF;
    
    -- Get old role for audit
    SELECT role INTO old_role 
    FROM public.gw_profiles 
    WHERE user_id = target_user_id;
    
    -- Validate role - now includes 'auditioner'
    IF new_role NOT IN ('admin', 'user', 'super-admin', 'member', 'alumna', 'fan', 'executive', 'auditioner') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Update the role
    UPDATE public.gw_profiles 
    SET role = new_role, updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Log security event
    PERFORM public.log_security_event(
        'role_changed',
        'user',
        target_user_id,
        jsonb_build_object(
            'old_role', old_role,
            'new_role', new_role,
            'changed_by', admin_user_id,
            'reason', reason
        )
    );
    
    RETURN FOUND;
END;
$$;

-- Create a function to transition auditioner to member after successful audition
CREATE OR REPLACE FUNCTION public.transition_auditioner_to_member(applicant_user_id uuid, performed_by uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_role text;
    admin_user_id uuid;
BEGIN
    admin_user_id := COALESCE(performed_by, auth.uid());
    
    -- Check if performer has admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = admin_user_id 
        AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
    ) THEN
        RAISE EXCEPTION 'Permission denied: Only admins can transition roles';
    END IF;
    
    -- Get current role
    SELECT role INTO current_role 
    FROM public.gw_profiles 
    WHERE user_id = applicant_user_id;
    
    -- Only transition if currently an auditioner
    IF current_role != 'auditioner' THEN
        RAISE EXCEPTION 'Invalid transition: User must be an auditioner to become a member';
    END IF;
    
    -- Update role to member
    UPDATE public.gw_profiles 
    SET 
        role = 'member',
        verified = true,
        updated_at = now()
    WHERE user_id = applicant_user_id;
    
    -- Update any related audition applications to accepted
    UPDATE public.audition_applications 
    SET 
        status = 'accepted',
        updated_at = now()
    WHERE user_id = applicant_user_id 
    AND status IN ('submitted', 'under_review', 'pending');
    
    -- Log the transition
    PERFORM public.log_security_event(
        'role_transitioned',
        'user',
        applicant_user_id,
        jsonb_build_object(
            'from_role', 'auditioner',
            'to_role', 'member',
            'transitioned_by', admin_user_id,
            'reason', 'Successful audition completion'
        )
    );
    
    RETURN true;
END;
$$;

-- Create indexes for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_gw_profiles_role ON public.gw_profiles(role);
CREATE INDEX IF NOT EXISTS idx_gw_profiles_academic_year ON public.gw_profiles(academic_year);
CREATE INDEX IF NOT EXISTS idx_audition_applications_status ON public.audition_applications(status);

-- Add a comment to document the migration
COMMENT ON COLUMN public.gw_profiles.academic_year IS 'Academic year of the student (Freshman, Sophomore, Junior, Senior)';
COMMENT ON COLUMN public.gw_profiles.major IS 'Primary academic major';
COMMENT ON COLUMN public.gw_profiles.minor IS 'Academic minor if applicable';
COMMENT ON COLUMN public.gw_profiles.voice_part_preference IS 'Preferred voice part (Soprano, Alto, Tenor, Bass)';
COMMENT ON COLUMN public.gw_profiles.gpa IS 'Grade Point Average';
COMMENT ON COLUMN public.gw_profiles.phone_number IS 'Contact phone number';
COMMENT ON COLUMN public.gw_profiles.student_id IS 'Student identification number';