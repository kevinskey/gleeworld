-- Add missing RLS policies for new communication tables

-- RLS Policies for gw_communication_system
CREATE POLICY "Users can view communications sent to them"
ON public.gw_communication_system FOR SELECT
USING (
  auth.uid() = sender_id OR
  EXISTS (
    SELECT 1 FROM public.gw_communication_recipients gcr
    WHERE gcr.communication_id = id
    AND (
      gcr.recipient_identifier = auth.uid()::text OR
      gcr.recipient_type = 'all_members'
    )
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Members can create communications"
ON public.gw_communication_system FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own communications"
ON public.gw_communication_system FOR UPDATE
USING (
  auth.uid() = sender_id OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_communication_recipients
CREATE POLICY "Users can view recipient lists for their communications"
ON public.gw_communication_recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_communication_system gcs
    WHERE gcs.id = communication_id
    AND (
      gcs.sender_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles gp
        WHERE gp.user_id = auth.uid()
        AND (gp.is_admin = true OR gp.is_super_admin = true)
      )
    )
  )
);

CREATE POLICY "Users can add recipients to their communications"
ON public.gw_communication_recipients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_communication_system gcs
    WHERE gcs.id = communication_id
    AND gcs.sender_id = auth.uid()
  )
);

-- RLS Policies for gw_communication_delivery
CREATE POLICY "Users can view delivery status for their communications"
ON public.gw_communication_delivery FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_communication_system gcs
    WHERE gcs.id = communication_id
    AND (
      gcs.sender_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles gp
        WHERE gp.user_id = auth.uid()
        AND (gp.is_admin = true OR gp.is_super_admin = true)
      )
    )
  )
);

CREATE POLICY "System can manage delivery logs"
ON public.gw_communication_delivery FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for gw_message_groups (update existing table)
DROP POLICY IF EXISTS "Everyone can view active message groups" ON public.gw_message_groups;
CREATE POLICY "Everyone can view active message groups"
ON public.gw_message_groups FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage message groups" ON public.gw_message_groups;
CREATE POLICY "Admins can manage message groups"
ON public.gw_message_groups FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_group_members
CREATE POLICY "Users can view group memberships"
ON public.gw_group_members FOR SELECT
USING (true);

CREATE POLICY "Admins can manage group memberships"
ON public.gw_group_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_communication_templates
CREATE POLICY "Everyone can view active templates"
ON public.gw_communication_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.gw_communication_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.gw_notification_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());