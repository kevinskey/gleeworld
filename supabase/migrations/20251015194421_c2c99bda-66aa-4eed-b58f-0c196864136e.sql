-- Grant librarians full access to both setlist tables

-- ============================================
-- 1. SETLISTS TABLE (has is_public column)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can create setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can update their own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can delete their own setlists" ON public.setlists;

CREATE POLICY "Librarians and admins can view all setlists"
ON public.setlists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR created_by = auth.uid()
  OR is_public = true
);

CREATE POLICY "Librarians and admins can manage all setlists"
ON public.setlists
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR created_by = auth.uid()
);

-- ============================================
-- 2. SETLIST_ITEMS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view setlist items for their setlists" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can add items to their setlists" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can update items in their setlists" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can delete items from their setlists" ON public.setlist_items;

CREATE POLICY "Librarians and admins can view all setlist items"
ON public.setlist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_items.setlist_id
      AND s.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_items.setlist_id
      AND s.is_public = true
  )
);

CREATE POLICY "Librarians and admins can manage all setlist items"
ON public.setlist_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_items.setlist_id
      AND s.created_by = auth.uid()
  )
);

-- ============================================
-- 3. GW_SETLISTS TABLE (has is_published column)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own gw setlists" ON public.gw_setlists;
DROP POLICY IF EXISTS "Users can create gw setlists" ON public.gw_setlists;
DROP POLICY IF EXISTS "Users can update their own gw setlists" ON public.gw_setlists;
DROP POLICY IF EXISTS "Users can delete their own gw setlists" ON public.gw_setlists;

CREATE POLICY "Librarians and admins can view all gw_setlists"
ON public.gw_setlists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR created_by = auth.uid()
  OR is_published = true
);

CREATE POLICY "Librarians and admins can manage all gw_setlists"
ON public.gw_setlists
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR created_by = auth.uid()
);

-- ============================================
-- 4. GW_SETLIST_ITEMS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view gw setlist items for their setlists" ON public.gw_setlist_items;
DROP POLICY IF EXISTS "Users can add items to their gw setlists" ON public.gw_setlist_items;
DROP POLICY IF EXISTS "Users can update items in their gw setlists" ON public.gw_setlist_items;
DROP POLICY IF EXISTS "Users can delete items from their gw setlists" ON public.gw_setlist_items;

CREATE POLICY "Librarians and admins can view all gw_setlist items"
ON public.gw_setlist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_setlists s
    WHERE s.id = gw_setlist_items.setlist_id
      AND s.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_setlists s
    WHERE s.id = gw_setlist_items.setlist_id
      AND s.is_published = true
  )
);

CREATE POLICY "Librarians and admins can manage all gw_setlist items"
ON public.gw_setlist_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role = 'librarian'
      AND ar.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_setlists s
    WHERE s.id = gw_setlist_items.setlist_id
      AND s.created_by = auth.uid()
  )
);