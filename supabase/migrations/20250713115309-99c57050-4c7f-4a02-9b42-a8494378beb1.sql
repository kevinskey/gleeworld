-- Add RLS policies for authenticated users to manage sheet music
CREATE POLICY "Authenticated users can insert sheet music" 
ON public.gw_sheet_music 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their own sheet music" 
ON public.gw_sheet_music 
FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can delete their own sheet music" 
ON public.gw_sheet_music 
FOR DELETE 
TO authenticated 
USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can view all sheet music" 
ON public.gw_sheet_music 
FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);