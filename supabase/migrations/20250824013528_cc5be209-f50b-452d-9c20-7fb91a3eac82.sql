-- Update existing policies to ensure DELETE is allowed for study score owners

-- Drop and recreate the delete policy to ensure it works correctly
DROP POLICY IF EXISTS "study_scores_delete" ON public.gw_study_scores;

CREATE POLICY "study_scores_delete" ON public.gw_study_scores
  FOR DELETE USING (
    owner_id = auth.uid() OR 
    check_user_admin_simple()
  );