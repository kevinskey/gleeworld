-- Add RLS policy to allow users to delete their own journal entries
CREATE POLICY "Users can delete their own journal entries" 
ON public.mus240_journal_entries 
FOR DELETE 
USING (auth.uid() = student_id);