-- Update enrollment policies to allow both students and members

-- Drop existing enrollment policies
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.glee_academy_enrollments;
DROP POLICY IF EXISTS "Students can register for courses" ON public.glee_academy_enrollments;
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.glee_academy_enrollments;

-- Allow students and members to view their own enrollments
CREATE POLICY "Students and members can view their own enrollments"
  ON public.glee_academy_enrollments
  FOR SELECT
  USING (
    student_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.app_roles
      WHERE user_id = auth.uid()
      AND role IN ('student', 'member')
      AND is_active = true
    )
  );

-- Allow students and members to enroll in courses
CREATE POLICY "Students and members can register for courses"
  ON public.glee_academy_enrollments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.app_roles
      WHERE user_id = auth.uid()
      AND role IN ('student', 'member')
      AND is_active = true
    )
  );

-- Admins and instructors can manage all enrollments
CREATE POLICY "Admins can manage all enrollments"
  ON public.glee_academy_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true OR role = 'instructor')
    )
  );

-- Create function to auto-assign student role on academy registration
CREATE OR REPLACE FUNCTION public.handle_academy_student_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has a role
  IF NOT EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = NEW.id
  ) THEN
    -- Assign student role for academy registrations
    INSERT INTO public.app_roles (user_id, role, is_active)
    VALUES (NEW.id, 'student', true);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for academy student signups
DROP TRIGGER IF EXISTS on_academy_student_created ON auth.users;
CREATE TRIGGER on_academy_student_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  WHEN (NEW.raw_user_meta_data->>'registration_type' = 'academy')
  EXECUTE FUNCTION public.handle_academy_student_signup();