-- PHASE 2: Fix Remaining Security Issues

-- 1. Fix all remaining functions missing search_path settings
CREATE OR REPLACE FUNCTION public.user_has_budget_permission(budget_id_param uuid, permission_type_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_permissions
    WHERE budget_id = budget_id_param 
    AND user_id = auth.uid() 
    AND permission_type = permission_type_param
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
RETURNS TABLE(id uuid, email text, full_name text, role text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT p.id, p.email, p.full_name, p.role, p.created_at
    FROM public.profiles p
    WHERE (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));
$$;

CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Check if current user is admin or super-admin
    IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Permission denied: Only admins or super-admins can update user roles';
    END IF;
    
    -- Only super-admins can assign super-admin role
    IF new_role = 'super-admin' AND NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied: Only super-admins can assign super-admin role';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('admin', 'user', 'super-admin') THEN
        RAISE EXCEPTION 'Invalid role: must be admin, user, or super-admin';
    END IF;
    
    -- Update the role
    UPDATE public.profiles 
    SET role = new_role, updated_at = now()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_user(user_email text, user_full_name text DEFAULT '', user_role text DEFAULT 'user')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_user_id uuid;
  temp_password text;
  result json;
BEGIN
  -- Check if current user is admin or super-admin
  IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied: Only admins can create users';
  END IF;
  
  -- Generate a temporary password (8 characters)
  temp_password := substring(encode(gen_random_bytes(6), 'base64') from 1 for 8);
  
  result := json_build_object(
    'email', user_email,
    'full_name', user_full_name,
    'role', user_role,
    'temp_password', temp_password
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_and_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Check if current user is admin or super-admin
    IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Permission denied: Only admins can delete users';
    END IF;
    
    -- Prevent self-deletion
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
    
    -- Delete user data in order (respecting foreign key constraints)
    DELETE FROM public.w9_forms WHERE user_id = target_user_id;
    DELETE FROM public.contract_signatures WHERE user_id = target_user_id OR admin_id = target_user_id;
    DELETE FROM public.contract_signatures_v2 WHERE contract_id IN (
        SELECT id FROM public.generated_contracts WHERE created_by = target_user_id
    );
    DELETE FROM public.contract_user_assignments WHERE user_id = target_user_id;
    DELETE FROM public.singer_contract_assignments WHERE singer_id = target_user_id;
    DELETE FROM public.generated_contracts WHERE created_by = target_user_id;
    DELETE FROM public.contracts WHERE created_by = target_user_id;
    DELETE FROM public.contracts_v2 WHERE created_by = target_user_id;
    DELETE FROM public.contract_documents WHERE created_by = target_user_id;
    DELETE FROM public.events WHERE created_by = target_user_id;
    DELETE FROM public.contract_templates WHERE created_by = target_user_id;
    DELETE FROM public.performers WHERE user_id = target_user_id;
    DELETE FROM public.activity_logs WHERE user_id = target_user_id;
    DELETE FROM public.admin_notifications WHERE admin_id = target_user_id;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_activity(p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id uuid DEFAULT NULL, p_details jsonb DEFAULT '{}', p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, action_type, resource_type, resource_id, 
    details, ip_address, user_agent
  )
  VALUES (
    p_user_id, p_action_type, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_task_notification(task_id_param uuid, user_id_param uuid, notification_type_param text, message_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.task_notifications (task_id, user_id, notification_type, message)
  VALUES (task_id_param, user_id_param, notification_type_param, message_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  assignee_name TEXT;
  message_text TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status != NEW.status THEN
    SELECT COALESCE(full_name, email) INTO assignee_name
    FROM public.profiles WHERE id = NEW.assigned_to;
    
    CASE NEW.status
      WHEN 'completed' THEN
        message_text := 'Task completed: ' || NEW.title;
        -- Notify the task creator
        PERFORM create_task_notification(
          NEW.id,
          NEW.assigned_by,
          'completed',
          message_text || ' by ' || COALESCE(assignee_name, 'Unknown User')
        );
      WHEN 'in_progress' THEN
        message_text := 'Task started: ' || NEW.title;
        -- Notify the task creator
        PERFORM create_task_notification(
          NEW.id,
          NEW.assigned_by,
          'updated',
          message_text || ' by ' || COALESCE(assignee_name, 'Unknown User')
        );
      ELSE
        message_text := 'Task status updated: ' || NEW.title || ' (' || NEW.status || ')';
        -- Notify the task creator
        PERFORM create_task_notification(
          NEW.id,
          NEW.assigned_by,
          'updated',
          message_text
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  assignee_name TEXT;
  assigner_name TEXT;
BEGIN
  -- Get names for the notification
  SELECT COALESCE(full_name, email) INTO assignee_name
  FROM public.profiles WHERE id = NEW.assigned_to;
  
  SELECT COALESCE(full_name, email) INTO assigner_name
  FROM public.profiles WHERE id = NEW.assigned_by;
  
  -- Create notification for the assigned user
  PERFORM create_task_notification(
    NEW.id,
    NEW.assigned_to,
    'assigned',
    'You have been assigned a new task: ' || NEW.title || ' by ' || COALESCE(assigner_name, 'Unknown User')
  );
  
  RETURN NEW;
END;
$$;

-- 2. Add missing policies for tables with RLS enabled but no policies

-- First, let's check which tables need policies by temporarily disabling RLS where not needed
-- or adding appropriate policies

-- Add basic policies for tables that should have RLS
CREATE POLICY "Users can view their own entries" ON public.gw_rhythm_transcriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries" ON public.gw_rhythm_transcriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries" ON public.gw_rhythm_transcriptions
FOR UPDATE USING (auth.uid() = user_id);

-- Add policy for setlists
CREATE POLICY "Users can view setlists" ON public.gw_setlists
FOR SELECT USING (
    is_public = true OR 
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
);

CREATE POLICY "Users can create setlists" ON public.gw_setlists
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own setlists" ON public.gw_setlists
FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
);

-- Add policy for vocal health entries
CREATE POLICY "Users can view their own vocal health entries" ON public.gw_vocal_health_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vocal health entries" ON public.gw_vocal_health_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocal health entries" ON public.gw_vocal_health_entries
FOR UPDATE USING (auth.uid() = user_id);

-- Add policy for licensing entries
CREATE POLICY "Admins can manage licensing entries" ON public.gw_licensing_entries
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
);

CREATE POLICY "Users can view active licensing entries" ON public.gw_licensing_entries
FOR SELECT USING (is_active = true);

-- Add policy for sheet music analytics
CREATE POLICY "Users can view their own analytics" ON public.gw_sheet_music_analytics
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can log analytics" ON public.gw_sheet_music_analytics
FOR INSERT WITH CHECK (true);

-- Add policy for sheet music annotations
CREATE POLICY "Users can manage their own annotations" ON public.gw_sheet_music_annotations
FOR ALL USING (auth.uid() = user_id);

-- Add policy for sheet music permissions
CREATE POLICY "Admins and sheet music owners can manage permissions" ON public.gw_sheet_music_permissions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.gw_sheet_music sm
        WHERE sm.id = gw_sheet_music_permissions.sheet_music_id 
        AND sm.created_by = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
);

-- Add policy for username permissions
CREATE POLICY "Admins can manage username permissions" ON public.username_permissions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
);

-- Users can view their own username permissions
CREATE POLICY "Users can view their own username permissions" ON public.username_permissions
FOR SELECT USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 3. Fix remaining function search paths
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_music()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_play_count(track_uuid uuid)
RETURNS void
LANGUAGE sql
SET search_path = 'public'
AS $$
  UPDATE public.music_tracks 
  SET play_count = play_count + 1 
  WHERE id = track_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_track_like_count(track_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.track_likes WHERE track_id = track_uuid;
$$;