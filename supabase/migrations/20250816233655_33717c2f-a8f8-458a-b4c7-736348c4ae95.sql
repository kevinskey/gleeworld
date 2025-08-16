-- Fix infinite recursion in RLS policies for fy_cohorts and fy_students

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can view their cohort" ON public.fy_cohorts;
DROP POLICY IF EXISTS "Students can view their own record and cohort members" ON public.fy_students;
DROP POLICY IF EXISTS "Coordinators and staff can manage cohorts" ON public.fy_cohorts;
DROP POLICY IF EXISTS "Coordinators and staff can manage students" ON public.fy_students;

-- Create simple, non-recursive policies for fy_cohorts
CREATE POLICY "fy_coordinators_manage_cohorts" 
ON public.fy_cohorts FOR ALL
USING (coordinator_id = auth.uid() OR is_fy_staff());

CREATE POLICY "fy_students_view_cohorts" 
ON public.fy_cohorts FOR SELECT
USING (true); -- Allow all authenticated users to view cohorts for now

-- Create simple, non-recursive policies for fy_students  
CREATE POLICY "fy_coordinators_manage_students"
ON public.fy_students FOR ALL  
USING (is_fy_staff());

CREATE POLICY "fy_students_view_own_record"
ON public.fy_students FOR SELECT
USING (user_id = auth.uid() OR is_fy_staff());

-- Create a broader policy for admins to access everything
CREATE POLICY "fy_admin_full_access_cohorts"
ON public.fy_cohorts FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "fy_admin_full_access_students"  
ON public.fy_students FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));