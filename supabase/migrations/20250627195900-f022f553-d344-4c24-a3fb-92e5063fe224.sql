
-- Add missing RLS policies for W9 forms table
CREATE POLICY "Users can delete their own W9 forms" 
ON public.w9_forms FOR DELETE 
USING (auth.uid() = user_id);
