-- CRITICAL SECURITY FIXES - PHASE 1
-- Fix Search Path Vulnerabilities and Add Missing RLS Policies

-- 1. Fix remaining functions with search path vulnerabilities
CREATE OR REPLACE FUNCTION public.user_can_edit_budget(budget_id_param uuid, created_by_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
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
 STABLE SECURITY DEFINER
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
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT up.module_name, up.granted_at, up.expires_at, up.notes
  FROM public.username_permissions up
  WHERE up.user_email = user_email_param 
  AND up.is_active = true
  AND (up.expires_at IS NULL OR up.expires_at > now());
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

CREATE OR REPLACE FUNCTION public.user_has_budget_permission(budget_id_param uuid, permission_type_param text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_permissions
    WHERE budget_id = budget_id_param 
    AND user_id = auth.uid() 
    AND permission_type = permission_type_param
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_can_view_budget(budget_id_param uuid, created_by_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'view')
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$function$;

-- 2. Add Missing RLS Policies for Tables with RLS Enabled but No Policies

-- budget_attachments - Add basic user access policy
CREATE POLICY "Users can view budget attachments they have access to"
ON public.budget_attachments
FOR SELECT
USING (
  (event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = budget_attachments.event_id 
    AND (created_by = auth.uid() OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'super-admin')
    ))
  )) OR
  (budget_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE id = budget_attachments.budget_id 
    AND (created_by = auth.uid() OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'super-admin')
    ))
  ))
);

-- contract_recipients - Add basic access policy
CREATE POLICY "Users can view contract recipients for their contracts"
ON public.contract_recipients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts_v2 
    WHERE id = contract_recipients.contract_id 
    AND (created_by = auth.uid() OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'super-admin')
    ))
  )
);

-- dashboard_settings - Add view policy for authenticated users
CREATE POLICY "Authenticated users can view dashboard settings"
ON public.dashboard_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- event_images - Add basic access policy
CREATE POLICY "Users can view event images"
ON public.event_images
FOR SELECT
USING (
  event_id IS NULL OR EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_images.event_id
  )
);

-- 3. Create Enhanced Security Functions for Token Management

CREATE OR REPLACE FUNCTION public.generate_secure_token(token_type text, user_id_param uuid DEFAULT NULL, metadata_param jsonb DEFAULT '{}'::jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  token_data jsonb;
  token_string text;
  timestamp_val bigint;
BEGIN
  -- Generate timestamp
  timestamp_val := extract(epoch from now());
  
  -- Create token payload
  token_data := jsonb_build_object(
    'type', token_type,
    'user_id', COALESCE(user_id_param, auth.uid()),
    'issued_at', timestamp_val,
    'expires_at', timestamp_val + 3600, -- 1 hour expiry
    'metadata', metadata_param,
    'nonce', encode(gen_random_bytes(16), 'hex')
  );
  
  -- Generate secure token with HMAC
  token_string := encode(
    hmac(
      token_data::text,
      COALESCE(current_setting('app.jwt_secret', true), 'fallback_secret'),
      'sha256'
    ),
    'base64'
  ) || '.' || encode(token_data::text::bytea, 'base64');
  
  RETURN token_string;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_secure_token(token_param text, expected_type text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  token_parts text[];
  signature_part text;
  payload_part text;
  payload_data jsonb;
  expected_signature text;
  current_time bigint;
BEGIN
  -- Split token into signature and payload
  token_parts := string_to_array(token_param, '.');
  
  IF array_length(token_parts, 1) != 2 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid token format');
  END IF;
  
  signature_part := token_parts[1];
  payload_part := token_parts[2];
  
  -- Decode payload
  BEGIN
    payload_data := convert_from(decode(payload_part, 'base64'), 'UTF8')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid payload encoding');
  END;
  
  -- Verify signature
  expected_signature := encode(
    hmac(
      payload_data::text,
      COALESCE(current_setting('app.jwt_secret', true), 'fallback_secret'),
      'sha256'
    ),
    'base64'
  );
  
  IF signature_part != expected_signature THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid signature');
  END IF;
  
  -- Check expiry
  current_time := extract(epoch from now());
  IF (payload_data->>'expires_at')::bigint < current_time THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token expired');
  END IF;
  
  -- Check type if specified
  IF expected_type IS NOT NULL AND (payload_data->>'type') != expected_type THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid token type');
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'payload', payload_data);
END;
$function$;

-- 4. Enhanced QR Code Security
CREATE OR REPLACE FUNCTION public.generate_secure_qr_token_v2(event_id_param uuid, valid_for_minutes integer DEFAULT 60)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  metadata_obj jsonb;
BEGIN
  -- Validate event exists
  IF NOT EXISTS (SELECT 1 FROM public.gw_events WHERE id = event_id_param) THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Create metadata
  metadata_obj := jsonb_build_object(
    'event_id', event_id_param,
    'created_by', auth.uid(),
    'valid_until', extract(epoch from now() + (valid_for_minutes || ' minutes')::interval)
  );
  
  RETURN public.generate_secure_token('qr_attendance', auth.uid(), metadata_obj);
END;
$function$;

-- 5. Rate Limiting Table for Security
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP, user_id, etc.
  action_type text NOT NULL,
  count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limits - only system can manage
CREATE POLICY "System can manage rate limits"
ON public.security_rate_limits
FOR ALL
USING (false); -- No direct access, only through functions

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(identifier_param text, action_type_param text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old entries
  DELETE FROM public.security_rate_limits 
  WHERE window_start < window_start_time;
  
  -- Get current count for this identifier and action
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM public.security_rate_limits
  WHERE identifier = identifier_param 
  AND action_type = action_type_param
  AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_count >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Increment counter
  INSERT INTO public.security_rate_limits (identifier, action_type, count)
  VALUES (identifier_param, action_type_param, 1)
  ON CONFLICT (identifier, action_type) 
  DO UPDATE SET count = security_rate_limits.count + 1, created_at = now();
  
  RETURN true;
END;
$function$;

-- Add unique constraint for rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
ON public.security_rate_limits (identifier, action_type);

-- 6. Security Audit Enhancements
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  p_action_type text, 
  p_resource_type text, 
  p_resource_id uuid DEFAULT NULL, 
  p_details jsonb DEFAULT '{}', 
  p_ip_address inet DEFAULT NULL, 
  p_user_agent text DEFAULT NULL,
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  log_id uuid;
  risk_score integer DEFAULT 0;
BEGIN
  -- Calculate risk score based on action type
  CASE p_action_type
    WHEN 'login_failed' THEN risk_score := 3;
    WHEN 'privilege_escalation_attempt' THEN risk_score := 10;
    WHEN 'unauthorized_access_attempt' THEN risk_score := 7;
    WHEN 'rate_limit_exceeded' THEN risk_score := 5;
    ELSE risk_score := 1;
  END CASE;
  
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id,
    details, ip_address, user_agent, created_at
  )
  VALUES (
    auth.uid(), p_action_type, p_resource_type, p_resource_id,
    p_details || jsonb_build_object('severity', p_severity, 'risk_score', risk_score), 
    p_ip_address, p_user_agent, now()
  )
  RETURNING id INTO log_id;
  
  -- Alert on high risk events
  IF risk_score >= 7 THEN
    INSERT INTO public.gw_notifications (
      user_id, title, message, type, priority
    )
    SELECT 
      p.user_id,
      'Security Alert',
      'High-risk security event detected: ' || p_action_type,
      'security',
      10
    FROM public.gw_profiles p 
    WHERE p.is_admin = true OR p.is_super_admin = true;
  END IF;
  
  RETURN log_id;
END;
$function$;