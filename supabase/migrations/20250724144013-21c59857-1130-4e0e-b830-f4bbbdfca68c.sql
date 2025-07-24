-- PHASE 3: Complete Security Hardening

-- Fix all remaining functions without proper search_path
CREATE OR REPLACE FUNCTION public.create_budget_transaction_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only create budget transaction if the payment is linked to a contract that has a budget
  IF NEW.contract_id IS NOT NULL THEN
    INSERT INTO public.budget_transactions (
      budget_id,
      payment_id,
      transaction_type,
      amount,
      description,
      transaction_date
    )
    SELECT 
      b.id,
      NEW.id,
      'payment',
      NEW.amount,
      CONCAT('Payment: ', NEW.notes),
      NEW.payment_date::date
    FROM public.budgets b
    WHERE b.contract_id::text = NEW.contract_id::text
    AND b.status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_budget_spent_amounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.create_notification_with_delivery(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_category text DEFAULT 'general'::text, p_action_url text DEFAULT NULL::text, p_action_label text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_priority integer DEFAULT 0, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_send_email boolean DEFAULT false, p_send_sms boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert notification
  INSERT INTO public.gw_notifications (
    user_id, title, message, type, category, action_url, 
    action_label, metadata, priority, expires_at
  )
  VALUES (
    p_user_id, p_title, p_message, p_type, p_category, p_action_url,
    p_action_label, p_metadata, p_priority, p_expires_at
  )
  RETURNING id INTO notification_id;
  
  -- Log internal delivery
  INSERT INTO public.gw_notification_delivery_log (
    notification_id, user_id, delivery_method, status, sent_at
  )
  VALUES (
    notification_id, p_user_id, 'internal', 'delivered', now()
  );
  
  -- Log email delivery if requested
  IF p_send_email THEN
    INSERT INTO public.gw_notification_delivery_log (
      notification_id, user_id, delivery_method, status
    )
    VALUES (
      notification_id, p_user_id, 'email', 'pending'
    );
  END IF;
  
  -- Log SMS delivery if requested
  IF p_send_sms THEN
    INSERT INTO public.gw_notification_delivery_log (
      notification_id, user_id, delivery_method, status
    )
    VALUES (
      notification_id, p_user_id, 'sms', 'pending'
    );
  END IF;
  
  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_gw_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_gw_event_to_events()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- When a gw_event is created or updated, sync to events table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO events (
      id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      location,
      created_by,
      created_at,
      updated_at,
      send_contracts,
      event_name,
      expected_headcount,
      approval_needed,
      approved,
      image_url
    ) VALUES (
      NEW.id,
      NEW.title,
      NEW.description,
      COALESCE(NEW.event_type, 'other'),
      NEW.start_date,
      NEW.end_date,
      COALESCE(NEW.location, NEW.venue_name),
      NEW.created_by,
      NEW.created_at,
      NEW.updated_at,
      false,
      NEW.venue_name,
      NEW.max_attendees,
      COALESCE(NEW.registration_required, false),
      CASE WHEN NEW.status = 'confirmed' THEN true ELSE false END,
      NEW.image_url
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      event_type = EXCLUDED.event_type,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      location = EXCLUDED.location,
      updated_at = EXCLUDED.updated_at,
      event_name = EXCLUDED.event_name,
      expected_headcount = EXCLUDED.expected_headcount,
      approval_needed = EXCLUDED.approval_needed,
      approved = EXCLUDED.approved,
      image_url = EXCLUDED.image_url;
    RETURN NEW;
  END IF;
  
  -- When a gw_event is deleted, also delete from events table
  IF TG_OP = 'DELETE' THEN
    DELETE FROM events WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.gw_notifications 
  SET is_read = true, updated_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.gw_notifications 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Check if there are any overlapping appointments (excluding cancelled ones)
  IF EXISTS (
    SELECT 1 
    FROM gw_appointments 
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status != 'cancelled'
    AND (
      -- Check for overlap: new appointment starts before existing ends AND new appointment ends after existing starts
      (NEW.appointment_date < (appointment_date + (duration_minutes || ' minutes')::interval) 
       AND (NEW.appointment_date + (NEW.duration_minutes || ' minutes')::interval) > appointment_date)
    )
  ) THEN
    RAISE EXCEPTION 'Appointment conflict: This time slot is already booked. Please select a different time.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rehearsals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_on_this_day_content(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(id uuid, title text, description text, year_occurred integer, years_ago integer, category text, image_url text)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.create_recurring_rehearsals(start_date date, end_date date, created_by_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  loop_date DATE;
  event_count INTEGER := 0;
  event_start_time TIMESTAMP WITH TIME ZONE;
  event_end_time TIMESTAMP WITH TIME ZONE;
  default_user_id UUID;
BEGIN
  -- Get a default user ID if none provided (use the first admin/super-admin)
  IF created_by_id IS NULL THEN
    SELECT id INTO default_user_id 
    FROM public.profiles 
    WHERE role IN ('admin', 'super-admin') 
    LIMIT 1;
    
    IF default_user_id IS NULL THEN
      RAISE EXCEPTION 'No admin user found and no created_by_id provided';
    END IF;
    
    created_by_id := default_user_id;
  END IF;
  
  -- Start from the given start_date
  loop_date := start_date;
  
  -- Loop through dates until end_date
  WHILE loop_date <= end_date LOOP
    -- Check if loop_date is Monday (1), Wednesday (3), or Friday (5)
    IF EXTRACT(DOW FROM loop_date) IN (1, 3, 5) THEN
      -- Set start time to 5:00 PM (17:00)
      event_start_time := loop_date + INTERVAL '17 hours';
      -- Set end time to 6:15 PM (18:15)
      event_end_time := loop_date + INTERVAL '18 hours 15 minutes';
      
      -- Insert the rehearsal event with 'performance' event_type to pass check constraint
      INSERT INTO public.gw_events (
        title,
        description,
        event_type,
        start_date,
        end_date,
        venue_name,
        location,
        is_public,
        registration_required,
        status,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        'Spelman College Glee Club Rehearsal',
        'Regular rehearsal for the Spelman College Glee Club. All members are expected to attend.',
        'performance',
        event_start_time,
        event_end_time,
        'Spelman College Music Building',
        'Atlanta, GA',
        true,
        false,
        'scheduled',
        created_by_id,
        NOW(),
        NOW()
      );
      
      event_count := event_count + 1;
    END IF;
    
    -- Move to next day
    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN event_count;
END;
$$;

-- Fix other major function search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_attendance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_gw_profile_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Update profiles table when gw_profiles changes
  UPDATE public.profiles SET
    full_name = NEW.full_name,
    phone_number = NEW.phone,
    role = CASE 
      WHEN NEW.is_super_admin = true THEN 'super-admin'
      WHEN NEW.is_admin = true THEN 'admin'
      ELSE profiles.role
    END,
    updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Update last_inventory_date when physical_copies_count changes
  IF OLD.physical_copies_count IS DISTINCT FROM NEW.physical_copies_count THEN
    NEW.last_inventory_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_notifications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_to_gw_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Update or insert into gw_profiles when profiles changes
  INSERT INTO public.gw_profiles (
    user_id, email, full_name, first_name, last_name, phone, created_at, updated_at
  ) VALUES (
    NEW.id, 
    NEW.email, 
    NEW.full_name,
    SPLIT_PART(NEW.full_name, ' ', 1),
    SPLIT_PART(NEW.full_name, ' ', 2),
    NEW.phone_number,
    NEW.created_at,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;