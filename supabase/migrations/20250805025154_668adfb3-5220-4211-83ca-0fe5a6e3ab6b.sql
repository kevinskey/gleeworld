-- CRITICAL SECURITY FIX: Add missing RLS policies for tables without policies

-- Budget Attachments
CREATE POLICY "Users can view budget attachments they have access to"
  ON public.budget_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_attachments.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.budget_permissions bp 
                 WHERE bp.budget_id = b.id AND bp.user_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

CREATE POLICY "Users can upload attachments to budgets they can edit"
  ON public.budget_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_attachments.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.budget_permissions bp 
                 WHERE bp.budget_id = b.id AND bp.user_id = auth.uid() AND bp.permission_type IN ('edit', 'manage')) OR
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Budget Permissions
CREATE POLICY "Budget creators and admins can manage permissions"
  ON public.budget_permissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_permissions.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

CREATE POLICY "Users can view their own budget permissions"
  ON public.budget_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Budget User Associations  
CREATE POLICY "Budget creators and admins can manage associations"
  ON public.budget_user_associations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_user_associations.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Dashboard Settings
CREATE POLICY "Users can manage their own dashboard settings"
  ON public.dashboard_settings FOR ALL
  USING (user_id = auth.uid());

-- Event Class Lists
CREATE POLICY "Event creators and admins can manage event class lists"
  ON public.event_class_lists FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_class_lists.event_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Event Class List Members
CREATE POLICY "Event creators and admins can manage event class list members"
  ON public.event_class_list_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.event_class_lists ecl
    JOIN public.events e ON e.id = ecl.event_id
    WHERE ecl.id = event_class_list_members.class_list_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Event Contracts
CREATE POLICY "Event creators and admins can manage event contracts"
  ON public.event_contracts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_contracts.event_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Event Images
CREATE POLICY "Event creators and admins can manage event images"
  ON public.event_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_images.event_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

CREATE POLICY "Anyone can view public event images"
  ON public.event_images FOR SELECT
  USING (is_public = true);

-- Event Line Items
CREATE POLICY "Event creators and admins can manage event line items"
  ON public.event_line_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_line_items.event_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Event Participants
CREATE POLICY "Event creators and admins can manage event participants"
  ON public.event_participants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_participants.event_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

CREATE POLICY "Users can view their own event participation"
  ON public.event_participants FOR SELECT
  USING (user_id = auth.uid());

-- Event Team Members
CREATE POLICY "Event creators and admins can manage event team members"
  ON public.event_team_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_team_members.event_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

CREATE POLICY "Users can view their own team member status"
  ON public.event_team_members FOR SELECT
  USING (user_id = auth.uid());