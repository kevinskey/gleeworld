
-- Add librarian role to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
                 JOIN pg_enum e ON t.oid = e.enumtypid 
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'librarian') THEN
    ALTER TYPE app_role ADD VALUE 'librarian';
  END IF;
END $$;

-- Enable RLS on setlists and setlist_items if not already enabled
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Admins and librarians can manage all setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can view public setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can view their own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can create their own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can update their own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can delete their own setlists" ON public.setlists;

DROP POLICY IF EXISTS "Admins and librarians can manage all setlist items" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can view setlist items for accessible setlists" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can manage their own setlist items" ON public.setlist_items;

-- Create helper function to check if user is admin or librarian
CREATE OR REPLACE FUNCTION public.is_admin_or_librarian(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = _user_id 
    AND role IN ('admin', 'super-admin', 'librarian')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = _user_id 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Setlists RLS Policies

-- Admins and librarians can do everything with setlists
CREATE POLICY "Admins and librarians can manage all setlists"
ON public.setlists
FOR ALL
USING (public.is_admin_or_librarian(auth.uid()))
WITH CHECK (public.is_admin_or_librarian(auth.uid()));

-- Users can view public setlists
CREATE POLICY "Users can view public setlists"
ON public.setlists
FOR SELECT
USING (is_public = true);

-- Users can view their own setlists
CREATE POLICY "Users can view their own setlists"
ON public.setlists
FOR SELECT
USING (created_by = auth.uid());

-- Users can create their own setlists
CREATE POLICY "Users can create their own setlists"
ON public.setlists
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Users can update their own setlists
CREATE POLICY "Users can update their own setlists"
ON public.setlists
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own setlists
CREATE POLICY "Users can delete their own setlists"
ON public.setlists
FOR DELETE
USING (created_by = auth.uid());

-- Setlist Items RLS Policies

-- Admins and librarians can do everything with setlist items
CREATE POLICY "Admins and librarians can manage all setlist items"
ON public.setlist_items
FOR ALL
USING (public.is_admin_or_librarian(auth.uid()))
WITH CHECK (public.is_admin_or_librarian(auth.uid()));

-- Users can view setlist items for setlists they can access
CREATE POLICY "Users can view setlist items for accessible setlists"
ON public.setlist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_items.setlist_id
    AND (s.is_public = true OR s.created_by = auth.uid())
  )
);

-- Users can manage items in their own setlists
CREATE POLICY "Users can manage their own setlist items"
ON public.setlist_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_items.setlist_id
    AND s.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_items.setlist_id
    AND s.created_by = auth.uid()
  )
);
