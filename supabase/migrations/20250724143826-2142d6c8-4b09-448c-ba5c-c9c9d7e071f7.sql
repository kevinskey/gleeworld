-- PHASE 2: Fix Remaining Security Issues (Corrected)

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

-- 2. Fix remaining function search paths for other functions
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

CREATE OR REPLACE FUNCTION public.calculate_event_budget_totals(event_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  total_exp NUMERIC(10,2) := 0;
  total_inc NUMERIC(10,2) := 0;
  net_amt NUMERIC(10,2) := 0;
  food_total NUMERIC(10,2) := 0;
  materials_total NUMERIC(10,2) := 0;
  transport_total NUMERIC(10,2) := 0;
  media_total NUMERIC(10,2) := 0;
  promo_total NUMERIC(10,2) := 0;
  event_record RECORD;
BEGIN
  -- Get current event data
  SELECT honoraria, misc_supplies, admin_fees, contingency, ticket_sales, donations, club_support
  INTO event_record
  FROM public.events WHERE id = event_id_param;
  
  -- Calculate totals from budget tables
  SELECT COALESCE(SUM(total), 0) INTO food_total FROM public.food_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO materials_total FROM public.materials_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO transport_total FROM public.transport_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO media_total FROM public.media_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO promo_total FROM public.promo_budget WHERE event_id = event_id_param;
  
  -- Calculate total expenses
  total_exp := COALESCE(event_record.honoraria, 0) + 
               food_total + 
               materials_total + 
               transport_total + 
               media_total + 
               promo_total + 
               COALESCE(event_record.misc_supplies, 0) + 
               COALESCE(event_record.admin_fees, 0) + 
               COALESCE(event_record.contingency, 0);
  
  -- Calculate total income
  total_inc := COALESCE(event_record.ticket_sales, 0) + 
               COALESCE(event_record.donations, 0) + 
               COALESCE(event_record.club_support, 0);
  
  -- Calculate net total
  net_amt := total_inc - total_exp;
  
  -- Update the event record
  UPDATE public.events 
  SET 
    total_expenses = total_exp,
    total_income = total_inc,
    net_total = net_amt,
    updated_at = now()
  WHERE id = event_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_event_budget_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Determine the event_id based on the table
  IF TG_TABLE_NAME = 'food_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'materials_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'transport_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'media_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'promo_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'events' THEN
    PERFORM calculate_event_budget_totals(NEW.id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;