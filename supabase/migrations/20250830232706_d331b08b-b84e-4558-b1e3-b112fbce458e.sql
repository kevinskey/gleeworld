-- Drop all existing policies on the table
DROP POLICY IF EXISTS "Course instructors can manage video edits" ON public.mus240_video_edits;
DROP POLICY IF EXISTS "Everyone can view video edits" ON public.mus240_video_edits;

-- Create a simple policy that allows all authenticated users to insert/update
CREATE POLICY "Authenticated users can manage video edits" ON public.mus240_video_edits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a policy for viewing that allows everyone  
CREATE POLICY "Anyone can view video edits" ON public.mus240_video_edits
  FOR SELECT
  USING (true);