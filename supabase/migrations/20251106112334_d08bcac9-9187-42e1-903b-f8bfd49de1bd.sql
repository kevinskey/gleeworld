-- Fix RLS policies for glee_club_contacts to allow admins to upsert via REST
-- Drop existing permissive policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'glee_club_contacts' AND policyname = 'Admins can manage all contacts'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can manage all contacts" ON public.glee_club_contacts';
  END IF;
END $$;

-- Create a reusable condition for admin users (role or flags)
-- Note: includes both super_admin and super-admin spellings
CREATE POLICY "Admins can select contacts"
ON public.glee_club_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('admin','super_admin','super-admin') OR p.is_admin IS TRUE OR p.is_super_admin IS TRUE)
  )
);

CREATE POLICY "Admins can insert contacts"
ON public.glee_club_contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('admin','super_admin','super-admin') OR p.is_admin IS TRUE OR p.is_super_admin IS TRUE)
  )
);

CREATE POLICY "Admins can update contacts"
ON public.glee_club_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('admin','super_admin','super-admin') OR p.is_admin IS TRUE OR p.is_super_admin IS TRUE)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('admin','super_admin','super-admin') OR p.is_admin IS TRUE OR p.is_super_admin IS TRUE)
  )
);

CREATE POLICY "Admins can delete contacts"
ON public.glee_club_contacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('admin','super_admin','super-admin') OR p.is_admin IS TRUE OR p.is_super_admin IS TRUE)
  )
);
