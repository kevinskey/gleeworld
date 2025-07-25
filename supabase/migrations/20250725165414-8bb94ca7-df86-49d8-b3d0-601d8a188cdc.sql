-- SECURITY FIXES PART 3: COMPLETE ALL REMAINING FUNCTIONS AND AUTHENTICATION ENHANCEMENTS

-- Continue fixing all remaining functions
CREATE OR REPLACE FUNCTION public.user_can_edit_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_username_permission(user_email_param text, module_name_param text)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.username_permissions
    WHERE user_email = user_email_param 
    AND module_name = module_name_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_username_permissions(user_email_param text)
RETURNS TABLE(module_name text, granted_at timestamp with time zone, expires_at timestamp with time zone, notes text)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT up.module_name, up.granted_at, up.expires_at, up.notes
  FROM public.username_permissions up
  WHERE up.user_email = user_email_param 
  AND up.is_active = true
  AND (up.expires_at IS NULL OR up.expires_at > now());
$function$;

CREATE OR REPLACE FUNCTION public.update_username_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_sheet_music_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_sheet_music(sheet_music_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_sheet_music sm
    WHERE sm.id = sheet_music_id_param
    AND (
      sm.is_public = true OR
      sm.created_by = user_id_param OR
      EXISTS (
        SELECT 1 FROM public.gw_sheet_music_permissions smp
        WHERE smp.sheet_music_id = sheet_music_id_param 
        AND smp.user_id = user_id_param 
        AND smp.permission_type IN ('view', 'annotate', 'manage')
        AND smp.is_active = true
        AND (smp.expires_at IS NULL OR smp.expires_at > now())
      ) OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles p
        WHERE p.user_id = user_id_param AND p.is_admin = true
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.log_sheet_music_analytics(sheet_music_id_param uuid, user_id_param uuid, action_type_param text, page_number_param integer DEFAULT NULL::integer, session_duration_param integer DEFAULT NULL::integer, device_type_param text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO public.gw_sheet_music_analytics (
    sheet_music_id, user_id, action_type, page_number, 
    session_duration, device_type
  )
  VALUES (
    sheet_music_id_param, user_id_param, action_type_param, 
    page_number_param, session_duration_param, device_type_param
  )
  RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_upcoming_license_expirations(days_ahead integer DEFAULT 30)
RETURNS TABLE(id uuid, music_title text, license_type text, expires_on date, days_until_expiry integer)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    le.id,
    sm.title as music_title,
    le.license_type,
    le.expires_on,
    (le.expires_on - CURRENT_DATE) as days_until_expiry
  FROM public.gw_licensing_entries le
  JOIN public.gw_sheet_music sm ON sm.id = le.music_id
  WHERE le.is_active = true
    AND le.expires_on IS NOT NULL
    AND le.expires_on <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND le.expires_on >= CURRENT_DATE
  ORDER BY le.expires_on ASC;
$function$;

CREATE OR REPLACE FUNCTION public.update_rhythm_transcriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_setlists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_vocal_health_alerts(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.gw_vocal_health_entries 
    WHERE user_id = target_user_id 
    AND vocal_status = 'Fatigued'
    AND date >= CURRENT_DATE - INTERVAL '5 days'
    GROUP BY user_id
    HAVING COUNT(*) >= 3
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_user(user_email text, user_full_name text DEFAULT ''::text, user_role text DEFAULT 'user'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_and_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;