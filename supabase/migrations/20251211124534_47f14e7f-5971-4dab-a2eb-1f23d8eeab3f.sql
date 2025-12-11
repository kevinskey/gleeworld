-- Add UPDATE policy for gw_module_favorites so users can update sort_order
CREATE POLICY "Users can update their own module favorites"
ON public.gw_module_favorites
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);