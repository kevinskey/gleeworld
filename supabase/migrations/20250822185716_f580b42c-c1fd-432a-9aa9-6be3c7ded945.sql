-- Allow librarians to manage setlists
-- Add librarian role check function if it doesn't exist
CREATE OR REPLACE FUNCTION public.user_has_librarian_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = user_id_param 
    AND (role = 'librarian' OR is_admin = true OR is_super_admin = true)
  );
$$;

-- Update policies for gw_setlists table to allow librarians to manage setlists
CREATE POLICY "Librarians can manage setlists" 
ON public.gw_setlists 
FOR ALL 
USING (public.user_has_librarian_role(auth.uid()))
WITH CHECK (public.user_has_librarian_role(auth.uid()));

-- Update policies for setlists table to allow librarians to manage setlists  
CREATE POLICY "Librarians can manage setlists" 
ON public.setlists 
FOR ALL 
USING (public.user_has_librarian_role(auth.uid()))
WITH CHECK (public.user_has_librarian_role(auth.uid()));

-- Update policies for setlist items tables to allow librarians to manage items
CREATE POLICY "Librarians can manage gw_setlist_items" 
ON public.gw_setlist_items 
FOR ALL 
USING (public.user_has_librarian_role(auth.uid()))
WITH CHECK (public.user_has_librarian_role(auth.uid()));

CREATE POLICY "Librarians can manage setlist_items" 
ON public.setlist_items 
FOR ALL 
USING (public.user_has_librarian_role(auth.uid()))
WITH CHECK (public.user_has_librarian_role(auth.uid()));