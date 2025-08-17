-- Enable RLS on gw_scores table
ALTER TABLE public.gw_scores ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own scores
CREATE POLICY "Users can view their own scores" ON public.gw_scores
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own scores
CREATE POLICY "Users can insert their own scores" ON public.gw_scores
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own scores
CREATE POLICY "Users can update their own scores" ON public.gw_scores
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own scores
CREATE POLICY "Users can delete their own scores" ON public.gw_scores
FOR DELETE USING (auth.uid() = user_id);

-- Allow admins to view all scores
CREATE POLICY "Admins can view all scores" ON public.gw_scores
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to manage all scores
CREATE POLICY "Admins can manage all scores" ON public.gw_scores
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);