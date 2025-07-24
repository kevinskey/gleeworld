-- PHASE 3: Complete remaining function security fixes and address final issues

-- Fix remaining functions with search_path issues (final batch)
CREATE OR REPLACE FUNCTION public.calculate_event_budget_totals(event_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_event_budget_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;

-- Fix more functions
CREATE OR REPLACE FUNCTION public.sync_contract_with_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- If event_id is set, sync the contract data with the event
  IF NEW.event_id IS NOT NULL THEN
    UPDATE public.generated_contracts 
    SET 
      event_name = (SELECT title FROM public.events WHERE id = NEW.event_id),
      event_dates = (SELECT 
        CASE 
          WHEN end_date IS NOT NULL THEN
            TO_CHAR(start_date, 'Month DD, YYYY') || ' - ' || TO_CHAR(end_date, 'Month DD, YYYY')
          ELSE 
            TO_CHAR(start_date, 'Month DD, YYYY')
        END
        FROM public.events WHERE id = NEW.event_id),
      location = (SELECT location FROM public.events WHERE id = NEW.event_id)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contracts_on_event_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Update all contracts linked to this event
  UPDATE public.generated_contracts 
  SET 
    event_name = NEW.title,
    event_dates = CASE 
      WHEN NEW.end_date IS NOT NULL THEN
        TO_CHAR(NEW.start_date, 'Month DD, YYYY') || ' - ' || TO_CHAR(NEW.end_date, 'Month DD, YYYY')
      ELSE 
        TO_CHAR(NEW.start_date, 'Month DD, YYYY')
    END,
    location = NEW.location,
    updated_at = NOW()
  WHERE event_id = NEW.id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_gw_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_gw_profile_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name = COALESCE(NEW.first_name, '') || CASE 
      WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN ' ' 
      ELSE '' 
    END || COALESCE(NEW.last_name, '');
  END IF;
  RETURN NEW;
END;
$function$;

-- Add missing RLS policies for tables that have RLS enabled but no policies
CREATE POLICY "Admins can manage gw_security_audit_log entries"
ON public.gw_security_audit_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- Create a secure file access function for edge functions
CREATE OR REPLACE FUNCTION public.create_secure_file_access(
  p_user_id uuid,
  p_bucket_id text,
  p_file_path text,
  p_access_type text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile
  SELECT role, is_admin, is_super_admin
  INTO user_profile
  FROM public.gw_profiles
  WHERE user_id = p_user_id;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Admin access to all files
  IF user_profile.is_admin OR user_profile.is_super_admin THEN
    RETURN true;
  END IF;
  
  -- Check specific bucket permissions
  CASE p_bucket_id
    WHEN 'user-files' THEN
      -- Users can access their own files
      RETURN p_file_path LIKE p_user_id::text || '/%';
    WHEN 'sheet-music' THEN
      -- Check sheet music permissions
      RETURN EXISTS (
        SELECT 1 FROM public.gw_sheet_music_permissions smp
        JOIN public.gw_sheet_music sm ON sm.id = smp.sheet_music_id
        WHERE sm.file_path = p_file_path 
        AND smp.user_id = p_user_id 
        AND smp.is_active = true
        AND (smp.expires_at IS NULL OR smp.expires_at > now())
      );
    ELSE
      -- Default deny
      RETURN false;
  END CASE;
END;
$function$;