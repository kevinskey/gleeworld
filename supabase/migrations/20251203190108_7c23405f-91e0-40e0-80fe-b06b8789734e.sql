-- Drop potentially conflicting policies and create a clean one
DROP POLICY IF EXISTS "Students can view published tests" ON public.glee_academy_tests;
DROP POLICY IF EXISTS "Anyone can view published tests" ON public.glee_academy_tests;

-- Create a simple, clear policy for viewing published tests
CREATE POLICY "Published tests are viewable by all authenticated users"
ON public.glee_academy_tests
FOR SELECT
TO authenticated
USING (is_published = true);