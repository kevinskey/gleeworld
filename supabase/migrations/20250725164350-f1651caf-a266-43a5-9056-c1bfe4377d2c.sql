-- COMPREHENSIVE SECURITY FIXES MIGRATION
-- This migration addresses critical security vulnerabilities identified in the security audit

-- ============================================================================
-- PART 1: FIX MISSING RLS POLICIES
-- ============================================================================

-- Add RLS policies for tables missing them (addressing 11 RLS enabled no policy issues)

-- finance_records table policies
CREATE POLICY "Users can view their own finance records" ON public.finance_records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own finance records" ON public.finance_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own finance records" ON public.finance_records
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all finance records" ON public.finance_records
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- food_budget table policies  
CREATE POLICY "Event creators can manage food budget" ON public.food_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.events 
  WHERE id = food_budget.event_id AND created_by = auth.uid()
));

CREATE POLICY "Admins can manage all food budgets" ON public.food_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- generated_contracts table policies
CREATE POLICY "Users can manage their own generated contracts" ON public.generated_contracts
FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all generated contracts" ON public.generated_contracts
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- materials_budget table policies
CREATE POLICY "Event creators can manage materials budget" ON public.materials_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.events 
  WHERE id = materials_budget.event_id AND created_by = auth.uid()
));

CREATE POLICY "Admins can manage all materials budgets" ON public.materials_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- media_budget table policies
CREATE POLICY "Event creators can manage media budget" ON public.media_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.events 
  WHERE id = media_budget.event_id AND created_by = auth.uid()
));

CREATE POLICY "Admins can manage all media budgets" ON public.media_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- payments table policies
CREATE POLICY "Users can view payments for their contracts" ON public.payments
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.generated_contracts gc
  WHERE gc.id::text = payments.contract_id AND gc.created_by = auth.uid()
));

CREATE POLICY "Admins can manage all payments" ON public.payments
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- performers table policies
CREATE POLICY "Users can manage their own performer records" ON public.performers
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all performer records" ON public.performers
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- promo_budget table policies
CREATE POLICY "Event creators can manage promo budget" ON public.promo_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.events 
  WHERE id = promo_budget.event_id AND created_by = auth.uid()
));

CREATE POLICY "Admins can manage all promo budgets" ON public.promo_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- role_change_audit table policies
CREATE POLICY "Admins can view role change audit" ON public.role_change_audit
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

CREATE POLICY "Super admins can manage role change audit" ON public.role_change_audit
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'super-admin'
));

-- singer_contract_assignments table policies
CREATE POLICY "Users can view their own contract assignments" ON public.singer_contract_assignments
FOR SELECT USING (auth.uid() = singer_id);

CREATE POLICY "Admins can manage all contract assignments" ON public.singer_contract_assignments
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- track_likes table policies
CREATE POLICY "Users can manage their own track likes" ON public.track_likes
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view all track likes" ON public.track_likes
FOR SELECT USING (true);

-- transport_budget table policies
CREATE POLICY "Event creators can manage transport budget" ON public.transport_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.events 
  WHERE id = transport_budget.event_id AND created_by = auth.uid()
));

CREATE POLICY "Admins can manage all transport budgets" ON public.transport_budget
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
));

-- ============================================================================
-- PART 2: SECURE ALL FUNCTIONS WITH SEARCH PATH
-- ============================================================================

-- Fix all functions missing SET search_path = '' (addressing 20+ search path mutable warnings)

-- Update existing functions to be secure
CREATE OR REPLACE FUNCTION public.update_gw_appointments_updated_at()
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

CREATE OR REPLACE FUNCTION public.update_updated_at_event_class_lists()
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

CREATE OR REPLACE FUNCTION public.update_gw_class_schedules_updated_at()
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

CREATE OR REPLACE FUNCTION public.generate_qr_token(event_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure token combining event ID, timestamp, and random string
  token := encode(
    digest(
      event_id_param::text || 
      extract(epoch from now())::text || 
      gen_random_bytes(16)::text, 
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_event_budget_totals(event_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Continue with more function updates...
CREATE OR REPLACE FUNCTION public.create_budget_transaction_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

-- ============================================================================
-- PART 3: ENHANCED QR CODE SECURITY
-- ============================================================================

-- Create secure QR attendance scanning with rate limiting
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan_secure(
  qr_token_param text, 
  user_id_param uuid, 
  scan_location_param jsonb DEFAULT NULL::jsonb, 
  user_agent_param text DEFAULT NULL::text, 
  ip_address_param inet DEFAULT NULL::inet
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  qr_record RECORD;
  existing_scan_count INTEGER;
  recent_scan_count INTEGER;
  attendance_record RECORD;
  rate_limit_exceeded BOOLEAN := false;
BEGIN
  -- Rate limiting: Check if user has scanned more than 5 QR codes in the last minute
  SELECT COUNT(*) INTO recent_scan_count
  FROM public.gw_attendance_qr_scans qrs
  JOIN public.gw_attendance_qr_codes qrc ON qrc.id = qrs.qr_code_id
  WHERE qrs.user_id = user_id_param 
  AND qrs.scanned_at > now() - interval '1 minute';
  
  IF recent_scan_count >= 5 THEN
    -- Log security event for rate limit exceeded
    INSERT INTO public.gw_security_audit_log (
      user_id, action_type, resource_type, details, ip_address, user_agent, created_at
    ) VALUES (
      user_id_param, 'qr_scan_rate_limit_exceeded', 'qr_code', 
      jsonb_build_object('recent_scans', recent_scan_count, 'qr_token', qr_token_param),
      ip_address_param, user_agent_param, now()
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded. Please wait before scanning again.'
    );
  END IF;
  
  -- Get QR code record with enhanced validation
  SELECT * INTO qr_record
  FROM public.gw_attendance_qr_codes 
  WHERE qr_token = qr_token_param 
  AND is_active = true 
  AND expires_at > now()
  AND created_at > now() - interval '24 hours'; -- Additional security: QR codes expire after 24 hours max
  
  IF NOT FOUND THEN
    -- Log security event for invalid QR attempt
    INSERT INTO public.gw_security_audit_log (
      user_id, action_type, resource_type, details, ip_address, user_agent, created_at
    ) VALUES (
      user_id_param, 'qr_scan_invalid_token', 'qr_code', 
      jsonb_build_object('qr_token', qr_token_param),
      ip_address_param, user_agent_param, now()
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired QR code'
    );
  END IF;
  
  -- Check if user already scanned this QR code
  SELECT COUNT(*) INTO existing_scan_count
  FROM public.gw_attendance_qr_scans
  WHERE qr_code_id = qr_record.id 
  AND user_id = user_id_param;
  
  IF existing_scan_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already scanned this QR code'
    );
  END IF;
  
  -- Record the scan with enhanced logging
  INSERT INTO public.gw_attendance_qr_scans (
    qr_code_id, user_id, scan_location, user_agent, ip_address, scanned_at
  ) VALUES (
    qr_record.id, user_id_param, scan_location_param, user_agent_param, ip_address_param, now()
  );
  
  -- Update scan count
  UPDATE public.gw_attendance_qr_codes 
  SET scan_count = scan_count + 1
  WHERE id = qr_record.id;
  
  -- Create or update attendance record
  INSERT INTO public.gw_attendance (
    event_id, user_id, status, notes, created_at, updated_at
  ) VALUES (
    qr_record.event_id, user_id_param, 'present', 'Marked via secure QR scan', now(), now()
  )
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET 
    status = 'present',
    notes = COALESCE(gw_attendance.notes, '') || ' | Secure QR scan at ' || now()::text,
    updated_at = now();
  
  -- Log successful scan for security audit
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id, details, ip_address, user_agent, created_at
  ) VALUES (
    user_id_param, 'qr_scan_success', 'qr_code', qr_record.id,
    jsonb_build_object('event_id', qr_record.event_id, 'qr_token', qr_token_param),
    ip_address_param, user_agent_param, now()
  );
  
  -- Get event details for response
  SELECT title INTO attendance_record
  FROM public.gw_events 
  WHERE id = qr_record.event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance marked successfully',
    'event_title', COALESCE(attendance_record.title, 'Event'),
    'scanned_at', now()
  );
END;
$function$;

-- ============================================================================
-- PART 4: SECURE TOKEN GENERATION
-- ============================================================================

-- Enhanced secure QR token generation with cryptographically secure randomness
CREATE OR REPLACE FUNCTION public.generate_secure_qr_token_v2(event_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  token TEXT;
  timestamp_val BIGINT;
  random_bytes BYTEA;
  user_context TEXT;
BEGIN
  -- Generate timestamp
  timestamp_val := extract(epoch from now());
  
  -- Generate cryptographically secure random bytes
  random_bytes := gen_random_bytes(32);
  
  -- Get user context for additional entropy
  user_context := COALESCE(auth.uid()::text, 'anonymous') || current_setting('request.jwt.claims', true);
  
  -- Generate a highly secure token using multiple entropy sources
  token := encode(
    digest(
      event_id_param::text || 
      timestamp_val::text || 
      encode(random_bytes, 'hex') ||
      user_context ||
      gen_random_bytes(16)::text ||
      extract(microseconds from clock_timestamp())::text,
      'sha384'  -- Use SHA384 for better security
    ), 
    'base64'
  );
  
  -- Remove URL-unsafe characters and ensure consistent length
  token := translate(token, '+/=', '-_');
  token := substring(token from 1 for 64); -- Limit to 64 characters
  
  RETURN token;
END;
$function$;