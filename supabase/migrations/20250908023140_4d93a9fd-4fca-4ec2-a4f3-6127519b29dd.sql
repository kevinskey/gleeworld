-- CRITICAL SECURITY FIXES FOR GLEEWORLD DATABASE
-- Phase 1: Fix SECURITY DEFINER functions with unsafe search paths

-- 1. Fix all SECURITY DEFINER functions to use safe search paths
CREATE OR REPLACE FUNCTION public.update_gw_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_gw_communications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_gw_message_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_gw_communication_deliveries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_username_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_setlists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_annotation_shares_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_rhythm_transcriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Create secure bulk role update function with audit logging
CREATE OR REPLACE FUNCTION public.bulk_update_user_roles_secure(
  user_ids uuid[], 
  new_role text,
  performer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer := 0;
  current_user_profile RECORD;
  target_user_id uuid;
BEGIN
  -- Verify performer is admin
  SELECT is_admin, is_super_admin, role 
  INTO current_user_profile 
  FROM public.gw_profiles 
  WHERE user_id = performer_id;
  
  IF NOT FOUND OR NOT (
    current_user_profile.is_admin = true OR 
    current_user_profile.is_super_admin = true OR 
    current_user_profile.role IN ('admin', 'super-admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Validate new_role
  IF new_role NOT IN ('guest', 'fan', 'member', 'alumna', 'executive', 'admin', 'super-admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Process each user
  FOREACH target_user_id IN ARRAY user_ids
  LOOP
    -- Prevent self-privilege escalation
    IF target_user_id = performer_id AND new_role IN ('admin', 'super-admin') THEN
      CONTINUE;
    END IF;
    
    -- Update role
    UPDATE public.gw_profiles 
    SET 
      role = new_role,
      is_admin = CASE WHEN new_role IN ('admin', 'super-admin') THEN true ELSE false END,
      is_super_admin = CASE WHEN new_role = 'super-admin' THEN true ELSE false END,
      updated_at = now()
    WHERE user_id = target_user_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
      
      -- Log the change
      PERFORM public.log_security_event(
        'bulk_role_update',
        'user_role',
        target_user_id,
        jsonb_build_object(
          'new_role', new_role,
          'performer_id', performer_id,
          'timestamp', now()
        )
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'message', format('Successfully updated %s user roles', updated_count)
  );
END;
$function$;