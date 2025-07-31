-- Add missing DELETE policy for gw_performance_scores table
-- This allows users to delete their own performance scores (auditions, etc.)

CREATE POLICY "Users can delete their own scores" 
ON public.gw_performance_scores 
FOR DELETE 
USING (evaluator_id = auth.uid());