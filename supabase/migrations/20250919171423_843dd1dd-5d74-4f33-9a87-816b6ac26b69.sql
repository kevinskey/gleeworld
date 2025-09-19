-- Test and fix the is_mus240_student function
-- First, let's test the current function to see if it works
DO $$
DECLARE
    test_result BOOLEAN;
    sample_user_id UUID;
BEGIN
    -- Get a sample user from enrollments
    SELECT student_id INTO sample_user_id 
    FROM mus240_enrollments 
    WHERE enrollment_status = 'enrolled' 
    AND semester = 'Fall 2025' 
    LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        -- Test the function
        SELECT is_mus240_student(sample_user_id) INTO test_result;
        RAISE NOTICE 'Testing is_mus240_student function with user %: %', sample_user_id, test_result;
    ELSE
        RAISE NOTICE 'No enrolled students found for testing';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error testing is_mus240_student function: %', SQLERRM;
END $$;

-- Recreate the function to ensure it works properly with RLS
DROP FUNCTION IF EXISTS public.is_mus240_student(uuid);

CREATE OR REPLACE FUNCTION public.is_mus240_student(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  -- Security definer function can bypass RLS to check enrollment
  SELECT EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = user_id_param 
    AND enrollment_status = 'enrolled'
    AND semester = 'Fall 2025'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_mus240_student(uuid) TO authenticated;

-- Test the function again
DO $$
DECLARE
    test_result BOOLEAN;
    sample_user_id UUID;
BEGIN
    -- Get a sample user from enrollments
    SELECT student_id INTO sample_user_id 
    FROM mus240_enrollments 
    WHERE enrollment_status = 'enrolled' 
    AND semester = 'Fall 2025' 
    LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        -- Test the function
        SELECT is_mus240_student(sample_user_id) INTO test_result;
        RAISE NOTICE 'Testing recreated is_mus240_student function with user %: %', sample_user_id, test_result;
    ELSE
        RAISE NOTICE 'No enrolled students found for testing';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error testing recreated is_mus240_student function: %', SQLERRM;
END $$;