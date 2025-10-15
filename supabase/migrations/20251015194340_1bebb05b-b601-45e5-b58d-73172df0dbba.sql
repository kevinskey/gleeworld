-- Grant librarians full access to setlists - clean slate approach

-- Drop ALL existing policies on all setlist tables
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE tablename IN ('setlists', 'setlist_items', 'gw_setlists', 'gw_setlist_items')
      AND schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Create new comprehensive policies for SETLISTS table
CREATE POLICY "setlists_select_policy"
ON public.setlists FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
  OR is_public = true
);

CREATE POLICY "setlists_insert_policy"
ON public.setlists FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
);

CREATE POLICY "setlists_update_policy"
ON public.setlists FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
);

CREATE POLICY "setlists_delete_policy"
ON public.setlists FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
);

-- Create new policies for SETLIST_ITEMS table
CREATE POLICY "setlist_items_select_policy"
ON public.setlist_items FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.setlists s WHERE s.id = setlist_items.setlist_id AND (s.created_by = auth.uid() OR s.is_public = true))
);

CREATE POLICY "setlist_items_insert_policy"
ON public.setlist_items FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.setlists s WHERE s.id = setlist_items.setlist_id AND s.created_by = auth.uid())
);

CREATE POLICY "setlist_items_update_policy"
ON public.setlist_items FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.setlists s WHERE s.id = setlist_items.setlist_id AND s.created_by = auth.uid())
);

CREATE POLICY "setlist_items_delete_policy"
ON public.setlist_items FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.setlists s WHERE s.id = setlist_items.setlist_id AND s.created_by = auth.uid())
);

-- Create new policies for GW_SETLISTS table
CREATE POLICY "gw_setlists_select_policy"
ON public.gw_setlists FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
  OR is_published = true
);

CREATE POLICY "gw_setlists_insert_policy"
ON public.gw_setlists FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
);

CREATE POLICY "gw_setlists_update_policy"
ON public.gw_setlists FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
);

CREATE POLICY "gw_setlists_delete_policy"
ON public.gw_setlists FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR created_by = auth.uid()
);

-- Create new policies for GW_SETLIST_ITEMS table
CREATE POLICY "gw_setlist_items_select_policy"
ON public.gw_setlist_items FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.gw_setlists s WHERE s.id = gw_setlist_items.setlist_id AND (s.created_by = auth.uid() OR s.is_published = true))
);

CREATE POLICY "gw_setlist_items_insert_policy"
ON public.gw_setlist_items FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.gw_setlists s WHERE s.id = gw_setlist_items.setlist_id AND s.created_by = auth.uid())
);

CREATE POLICY "gw_setlist_items_update_policy"
ON public.gw_setlist_items FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.gw_setlists s WHERE s.id = gw_setlist_items.setlist_id AND s.created_by = auth.uid())
);

CREATE POLICY "gw_setlist_items_delete_policy"
ON public.gw_setlist_items FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true))
  OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'librarian' AND ar.is_active = true)
  OR EXISTS (SELECT 1 FROM public.gw_setlists s WHERE s.id = gw_setlist_items.setlist_id AND s.created_by = auth.uid())
);