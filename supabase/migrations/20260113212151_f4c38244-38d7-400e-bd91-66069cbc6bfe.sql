-- Fix the RLS policy for gw_hero_slides to allow admins to update slides properly
-- The issue is that the update policy is missing WITH CHECK clause

-- Drop the existing update policy
DROP POLICY IF EXISTS "Admins can update hero slides" ON public.gw_hero_slides;

-- Recreate with proper USING and WITH CHECK clauses
CREATE POLICY "Admins can update hero slides"
ON public.gw_hero_slides
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Also add a policy for admins to view ALL slides (including inactive ones) for management
DROP POLICY IF EXISTS "Admins can view all hero slides" ON public.gw_hero_slides;

CREATE POLICY "Admins can view all hero slides"
ON public.gw_hero_slides
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);