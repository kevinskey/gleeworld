-- SECURITY FIXES PART 2: COMPLETE REMAINING FUNCTION UPDATES
-- Fix all remaining functions missing SET search_path = '' 

-- Update more functions to be secure
CREATE OR REPLACE FUNCTION public.update_budget_spent_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update budget category spent amount
  IF NEW.budget_category_id IS NOT NULL THEN
    UPDATE public.budget_categories 
    SET spent_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.budget_transactions 
      WHERE budget_category_id = NEW.budget_category_id
    ),
    remaining_amount = allocated_amount - (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.budget_transactions 
      WHERE budget_category_id = NEW.budget_category_id
    )
    WHERE id = NEW.budget_category_id;
  END IF;
  
  -- Update budget total spent amount and remaining amount
  UPDATE public.budgets 
  SET spent_amount = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.budget_transactions 
    WHERE budget_id = NEW.budget_id
  ),
  remaining_amount = total_amount - (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.budget_transactions 
    WHERE budget_id = NEW.budget_id
  )
  WHERE id = NEW.budget_id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_gw_profiles_updated_at()
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

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.gw_notifications 
  SET is_read = true, updated_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_action_type text, p_resource_type text, p_resource_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id,
    details, ip_address, user_agent, created_at
  )
  VALUES (
    auth.uid(), p_action_type, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent, now()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
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

CREATE OR REPLACE FUNCTION public.cleanup_old_rehearsals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete rehearsal events that are older than 30 days
  DELETE FROM public.gw_events 
  WHERE title = 'Spelman College Glee Club Rehearsal'
    AND event_type = 'rehearsal'
    AND start_date < NOW() - INTERVAL '30 days';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_on_this_day_content(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(id uuid, title text, description text, year_occurred integer, years_ago integer, category text, image_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT 
        gh.id,
        gh.title,
        gh.description,
        gh.year_occurred,
        EXTRACT(YEAR FROM target_date)::integer - gh.year_occurred as years_ago,
        gh.category,
        gh.image_url
    FROM public.glee_history gh
    WHERE EXTRACT(MONTH FROM gh.event_date) = EXTRACT(MONTH FROM target_date)
      AND EXTRACT(DAY FROM gh.event_date) = EXTRACT(DAY FROM target_date)
    ORDER BY gh.year_occurred DESC;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_budget_permission(budget_id_param uuid, permission_type_param text)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_permissions
    WHERE budget_id = budget_id_param 
    AND user_id = auth.uid() 
    AND permission_type = permission_type_param
  );
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_attendance()
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

CREATE OR REPLACE FUNCTION public.update_inventory_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update last_inventory_date when physical_copies_count changes
  IF OLD.physical_copies_count IS DISTINCT FROM NEW.physical_copies_count THEN
    NEW.last_inventory_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_notifications()
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

CREATE OR REPLACE FUNCTION public.generate_sheet_music_filename(p_title text, p_composer text DEFAULT NULL::text, p_voice_part text DEFAULT NULL::text, p_version integer DEFAULT 1)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  filename TEXT;
  clean_title TEXT;
  clean_composer TEXT;
  clean_voice_part TEXT;
BEGIN
  -- Clean and format title
  clean_title := REGEXP_REPLACE(LOWER(p_title), '[^a-z0-9]+', '_', 'g');
  clean_title := TRIM(clean_title, '_');
  
  -- Clean composer if provided
  IF p_composer IS NOT NULL THEN
    clean_composer := REGEXP_REPLACE(LOWER(p_composer), '[^a-z0-9]+', '_', 'g');
    clean_composer := TRIM(clean_composer, '_');
  END IF;
  
  -- Clean voice part if provided
  IF p_voice_part IS NOT NULL THEN
    clean_voice_part := REGEXP_REPLACE(LOWER(p_voice_part), '[^a-z0-9]+', '_', 'g');
    clean_voice_part := TRIM(clean_voice_part, '_');
  END IF;
  
  -- Build filename: YYYY_composer_title_voicepart_v1.pdf
  filename := EXTRACT(YEAR FROM NOW())::TEXT;
  
  IF clean_composer IS NOT NULL THEN
    filename := filename || '_' || clean_composer;
  END IF;
  
  filename := filename || '_' || clean_title;
  
  IF clean_voice_part IS NOT NULL THEN
    filename := filename || '_' || clean_voice_part;
  END IF;
  
  filename := filename || '_v' || p_version::TEXT || '.pdf';
  
  RETURN filename;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_sheet_music_action(p_sheet_music_id uuid, p_user_id uuid, p_action_type text, p_page_number integer DEFAULT NULL::integer, p_session_duration integer DEFAULT NULL::integer, p_device_type text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO public.gw_sheet_music_analytics (
    sheet_music_id,
    user_id, 
    action_type,
    page_number,
    session_duration,
    device_type,
    timestamp_recorded
  ) VALUES (
    p_sheet_music_id,
    p_user_id,
    p_action_type,
    p_page_number,
    p_session_duration,
    p_device_type,
    NOW()
  ) RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$function$;