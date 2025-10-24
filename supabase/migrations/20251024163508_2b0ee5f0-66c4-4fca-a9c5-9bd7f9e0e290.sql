-- Add admin policies for group_updates_mus240
CREATE POLICY "Admins can insert updates"
ON public.group_updates_mus240
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update all updates"
ON public.group_updates_mus240
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Add admin policies for member contributions
CREATE POLICY "Admins can insert contributions"
ON public.group_update_member_contributions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update all contributions"
ON public.group_update_member_contributions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);