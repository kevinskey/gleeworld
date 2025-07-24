-- Fix search_path for critical security functions
CREATE OR REPLACE FUNCTION public.update_gw_appointments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_graduation_decade(grad_year integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
    SELECT CASE 
        WHEN grad_year IS NULL THEN 'Unknown'
        ELSE (grad_year / 10 * 10)::text || 's'
    END;
$function$;

CREATE OR REPLACE FUNCTION public.create_budget_transaction_from_finance_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Only create budget transaction if the finance record is linked to a contract with a budget
  IF NEW.reference IS NOT NULL THEN
    INSERT INTO public.budget_transactions (
      budget_id,
      finance_record_id,
      transaction_type,
      amount,
      description,
      transaction_date
    )
    SELECT 
      b.id,
      NEW.id,
      CASE 
        WHEN NEW.type = 'debit' THEN 'expense'
        WHEN NEW.type = 'credit' THEN 'payment'
        ELSE NEW.type
      END,
      ABS(NEW.amount),
      NEW.description,
      NEW.date
    FROM public.budgets b
    WHERE b.contract_id::text = NEW.reference
    AND b.status = 'active';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_task_notification(task_id_param uuid, user_id_param uuid, notification_type_param text, message_param text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.task_notifications (task_id, user_id, notification_type, message)
  VALUES (task_id_param, user_id_param, notification_type_param, message_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
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

CREATE OR REPLACE FUNCTION public.notify_task_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_activity(p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_user(user_email text, user_full_name text DEFAULT ''::text, user_role text DEFAULT 'user'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
  
  -- Create the user in auth.users (this requires service role, so we'll handle this in the edge function)
  -- For now, return the data needed for the edge function
  result := json_build_object(
    'email', user_email,
    'full_name', user_full_name,
    'role', user_role,
    'temp_password', temp_password
  );
  
  RETURN result;
END;
$function$;