-- Add missing DELETE policy for gw_marked_scores
CREATE POLICY "Uploaders can delete their marked scores" ON public.gw_marked_scores
  FOR DELETE USING (auth.uid() = uploader_id);

-- Also allow admins to delete any marked scores
CREATE POLICY "Admins can delete any marked scores" ON public.gw_marked_scores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );