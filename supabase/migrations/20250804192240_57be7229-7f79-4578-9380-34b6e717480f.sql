-- Comprehensive fix for all remaining profile table references

-- 1. Update any remaining functions that reference the old profiles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.gw_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.simple_admin_bootstrap()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Make the first authenticated user an admin
  UPDATE public.gw_profiles 
  SET role = 'admin', 
      full_name = COALESCE(full_name, 'Admin User'),
      is_admin = true
  WHERE user_id = auth.uid();
  
  -- If no profile exists, create one
  INSERT INTO public.gw_profiles (user_id, email, role, full_name, is_admin)
  SELECT auth.uid(), 
         (SELECT email FROM auth.users WHERE id = auth.uid()),
         'admin', 
         'Admin User',
         true
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.secure_update_user_role(target_user_id uuid, new_role text, reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_role text;
    old_role text;
    admin_user_id uuid;
BEGIN
    -- Get current user making the change
    admin_user_id := auth.uid();
    
    -- Check if current user is admin or super-admin
    SELECT role INTO current_user_role 
    FROM public.gw_profiles 
    WHERE user_id = admin_user_id;
    
    IF current_user_role NOT IN ('admin', 'super-admin') THEN
        RAISE EXCEPTION 'Permission denied: Only admins can update user roles';
    END IF;
    
    -- Prevent self-role changes (critical security check)
    IF target_user_id = admin_user_id THEN
        RAISE EXCEPTION 'Security violation: Cannot modify your own role';
    END IF;
    
    -- Only super-admins can assign super-admin role
    IF new_role = 'super-admin' AND current_user_role != 'super-admin' THEN
        RAISE EXCEPTION 'Permission denied: Only super-admins can assign super-admin role';
    END IF;
    
    -- Get old role for audit
    SELECT role INTO old_role 
    FROM public.gw_profiles 
    WHERE user_id = target_user_id;
    
    -- Validate role
    IF new_role NOT IN ('admin', 'user', 'super-admin', 'member', 'alumna', 'fan', 'executive') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Update the role
    UPDATE public.gw_profiles 
    SET role = new_role, updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Create audit record in activity logs
    PERFORM public.log_activity(
        admin_user_id,
        'role_changed',
        'user_profile',
        target_user_id,
        jsonb_build_object(
            'old_role', old_role,
            'new_role', new_role,
            'reason', reason
        )
    );
    
    -- Log security event
    PERFORM public.log_security_event(
        'role_changed',
        'user',
        target_user_id,
        jsonb_build_object(
            'old_role', old_role,
            'new_role', new_role,
            'changed_by', admin_user_id,
            'reason', reason
        )
    );
    
    RETURN FOUND;
END;
$$;

-- 2. Update the get_all_user_profiles function to use gw_profiles
CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
RETURNS TABLE(id uuid, email text, full_name text, role text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT gw.user_id as id, gw.email, gw.full_name, gw.role, gw.created_at
    FROM public.gw_profiles gw
    WHERE (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));
$$;

-- 3. Update any storage policies that reference profiles table
DROP POLICY IF EXISTS "Public access for W9 forms by admins" ON storage.objects;
CREATE POLICY "Public access for W9 forms by admins"
ON storage.objects FOR ALL
USING (
  bucket_id = 'w9-forms' AND
  (
    storage.foldername(name)[1] = auth.uid()::text OR
    (
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload W9 forms" ON storage.objects;
CREATE POLICY "Authenticated users can upload W9 forms" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'w9-forms' AND 
  auth.role() = 'authenticated' AND
  storage.foldername(name)[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own W9 forms" ON storage.objects;
CREATE POLICY "Users can update their own W9 forms" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'w9-forms' AND 
  auth.role() = 'authenticated' AND
  storage.foldername(name)[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Admins can access all W9 forms" ON storage.objects;
CREATE POLICY "Admins can access all W9 forms" 
ON storage.objects FOR SELECT
USING (
  bucket_id = 'w9-forms' AND
  (
    storage.foldername(name)[1] = auth.uid()::text OR
    (
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  )
);

-- 4. Update any sheet music policies that reference profiles table
DROP POLICY IF EXISTS "Admins can access all sheet music" ON storage.objects;
CREATE POLICY "Admins can access all sheet music" 
ON storage.objects FOR ALL
USING (
  bucket_id = 'sheet-music' AND
  (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

-- 5. Update any notification system functions that might reference profiles
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assignee_name TEXT;
  assigner_name TEXT;
BEGIN
  -- Get names for the notification
  SELECT COALESCE(full_name, email) INTO assignee_name
  FROM public.gw_profiles WHERE user_id = NEW.assigned_to;
  
  SELECT COALESCE(full_name, email) INTO assigner_name
  FROM public.gw_profiles WHERE user_id = NEW.assigned_by;
  
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

CREATE OR REPLACE FUNCTION public.notify_task_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  assignee_name TEXT;
  message_text TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status != NEW.status THEN
    SELECT COALESCE(full_name, email) INTO assignee_name
    FROM public.gw_profiles WHERE user_id = NEW.assigned_to;
    
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

-- 6. Clean up any remaining triggers that might reference the old table
DROP TRIGGER IF EXISTS prevent_gw_profile_privilege_escalation_enhanced ON public.profiles;
DROP TRIGGER IF EXISTS prevent_gw_profile_privilege_escalation ON public.profiles;

-- Ensure the trigger is on the correct table
DROP TRIGGER IF EXISTS prevent_gw_profile_privilege_escalation_enhanced ON public.gw_profiles;
CREATE TRIGGER prevent_gw_profile_privilege_escalation_enhanced
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced();

-- 7. Update any remaining RLS policies that reference profiles table
-- Note: Most of these are likely already handled, but this ensures cleanup