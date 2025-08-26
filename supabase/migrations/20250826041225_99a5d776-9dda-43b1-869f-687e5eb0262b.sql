-- Fix infinite recursion errors by creating security definer functions
-- and standardizing permission checks across the app

-- 1. Create standardized role checking functions (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.gw_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_admin_status()
RETURNS JSONB
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'is_admin', COALESCE(is_admin, false),
    'is_super_admin', COALESCE(is_super_admin, false),
    'is_exec_board', COALESCE(is_exec_board, false)
  )
  FROM public.gw_profiles 
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_exec_position()
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT position::text 
  FROM public.gw_executive_board_members 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- 2. Fix user role checking functions to be consistent
CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_id_param uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = user_id_param 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_secretary_role(user_id_param uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param 
    AND position = 'secretary' 
    AND is_active = true
  ) OR public.user_has_admin_role(user_id_param);
$$;

CREATE OR REPLACE FUNCTION public.user_has_alumnae_liaison_role(user_id_param uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param 
    AND position = 'alumnae_liaison' 
    AND is_active = true
  ) OR public.user_has_admin_role(user_id_param);
$$;

CREATE OR REPLACE FUNCTION public.user_has_pr_coordinator_role(user_id_param uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param 
    AND position = 'pr_coordinator' 
    AND is_active = true
  ) OR public.user_has_admin_role(user_id_param);
$$;

-- 3. Fix infinite recursion in policies by removing recursive table references
-- Drop and recreate problematic policies

-- Fix gw_recordings policies
DROP POLICY IF EXISTS "recording_admin_manage" ON public.gw_recordings;
DROP POLICY IF EXISTS "recording_member_own" ON public.gw_recordings;
DROP POLICY IF EXISTS "recording_select_own" ON public.gw_recordings;

CREATE POLICY "recording_admin_manage" 
ON public.gw_recordings 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "recording_member_own" 
ON public.gw_recordings 
FOR ALL 
USING (created_by = auth.uid());

-- Fix gw_study_scores policies
DROP POLICY IF EXISTS "study_scores_admin_manage" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_member_own" ON public.gw_study_scores;

CREATE POLICY "study_scores_admin_manage" 
ON public.gw_study_scores 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "study_scores_member_own" 
ON public.gw_study_scores 
FOR ALL 
USING (created_by = auth.uid());

-- Fix gw_study_score_collaborators policies
DROP POLICY IF EXISTS "study_score_collaborators_admin_manage" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "study_score_collaborators_owner_manage" ON public.gw_study_score_collaborators;

CREATE POLICY "study_score_collaborators_admin_manage" 
ON public.gw_study_score_collaborators 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "study_score_collaborators_access" 
ON public.gw_study_score_collaborators 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.gw_study_scores 
    WHERE id = study_score_id AND created_by = auth.uid()
  )
);

-- Fix gw_recording_shares policies
DROP POLICY IF EXISTS "recording_shares_admin_manage" ON public.gw_recording_shares;
DROP POLICY IF EXISTS "recording_shares_owner_manage" ON public.gw_recording_shares;

CREATE POLICY "recording_shares_admin_manage" 
ON public.gw_recording_shares 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "recording_shares_access" 
ON public.gw_recording_shares 
FOR SELECT 
USING (
  shared_with_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.gw_recordings 
    WHERE id = recording_id AND created_by = auth.uid()
  )
);

-- Fix gw_communication_recipients policies
DROP POLICY IF EXISTS "communication_recipients_admin_manage" ON public.gw_communication_recipients;
DROP POLICY IF EXISTS "communication_recipients_sender_manage" ON public.gw_communication_recipients;

CREATE POLICY "communication_recipients_admin_manage" 
ON public.gw_communication_recipients 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "communication_recipients_access" 
ON public.gw_communication_recipients 
FOR SELECT 
USING (
  recipient_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.gw_communications 
    WHERE id = communication_id AND created_by = auth.uid()
  )
);

-- Fix gw_communication_system policies
DROP POLICY IF EXISTS "communication_system_admin_manage" ON public.gw_communication_system;
DROP POLICY IF EXISTS "communication_system_member_access" ON public.gw_communication_system;

CREATE POLICY "communication_system_admin_manage" 
ON public.gw_communication_system 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "communication_system_member_access" 
ON public.gw_communication_system 
FOR SELECT 
USING (
  public.get_current_user_role() IN ('member', 'executive', 'admin', 'super-admin') OR
  public.user_has_admin_role(auth.uid())
);