-- Security Fix Migration: Address Critical RLS and Function Security Issues

-- 1. Enable RLS on tables that are missing it
ALTER TABLE public.food_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for food_budget
CREATE POLICY "Users can view food budget for events they have access to"
ON public.food_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = food_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage food budget for events they have access to"
ON public.food_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = food_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 3. Create RLS policies for materials_budget
CREATE POLICY "Users can view materials budget for events they have access to"
ON public.materials_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = materials_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage materials budget for events they have access to"
ON public.materials_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = materials_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 4. Create RLS policies for transport_budget
CREATE POLICY "Users can view transport budget for events they have access to"
ON public.transport_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = transport_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage transport budget for events they have access to"
ON public.transport_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = transport_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 5. Create RLS policies for media_budget
CREATE POLICY "Users can view media budget for events they have access to"
ON public.media_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = media_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage media budget for events they have access to"
ON public.media_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = media_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 6. Create RLS policies for promo_budget
CREATE POLICY "Users can view promo budget for events they have access to"
ON public.promo_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = promo_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage promo budget for events they have access to"
ON public.promo_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = promo_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 7. Create RLS policies for finance_records
CREATE POLICY "Admins can manage all finance records"
ON public.finance_records FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can view finance records for their events"
ON public.finance_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id::text = finance_records.reference 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid()
    )
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 8. Create RLS policies for payments
CREATE POLICY "Admins can manage all payments"
ON public.payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can view payments for their contracts"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts_v2 
    WHERE contracts_v2.id::text = payments.contract_id 
    AND contracts_v2.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 9. Create RLS policies for receipts
CREATE POLICY "Admins can manage all receipts"
ON public.receipts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can manage their own receipts"
ON public.receipts FOR ALL
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 10. Create RLS policies for performer_availability
CREATE POLICY "Admins can manage all performer availability"
ON public.performer_availability FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Performers can manage their own availability"
ON public.performer_availability FOR ALL
USING (
  performer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 11. Create RLS policies for performers
CREATE POLICY "Admins can manage all performers"
ON public.performers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can view their own performer record"
ON public.performers FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 12. Create RLS policies for music_tracks
CREATE POLICY "Public can view public music tracks"
ON public.music_tracks FOR SELECT
USING (is_public = true);

CREATE POLICY "Admins can manage all music tracks"
ON public.music_tracks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can manage their own music tracks"
ON public.music_tracks FOR ALL
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 13. Fix security definer functions - add proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND role = 'super-admin'
    );
$$;

-- 14. Enhanced QR code security function
CREATE OR REPLACE FUNCTION public.generate_secure_qr_token(event_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  token TEXT;
  current_time BIGINT;
BEGIN
  -- Generate timestamp
  current_time := extract(epoch from now());
  
  -- Generate a more secure token using event ID, timestamp, and random bytes
  token := encode(
    digest(
      event_id_param::text || 
      current_time::text || 
      gen_random_bytes(32)::text || 
      auth.uid()::text,
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$$;

-- 15. Enhanced QR scan processing with rate limiting
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
AS $$
DECLARE
  qr_record RECORD;
  existing_scan_count INTEGER;
  recent_scan_count INTEGER;
  attendance_record RECORD;
BEGIN
  -- Check for rate limiting - max 5 scans per minute per user
  SELECT COUNT(*) INTO recent_scan_count
  FROM public.gw_attendance_qr_scans qrs
  JOIN public.gw_attendance_qr_codes qrc ON qrc.id = qrs.qr_code_id
  WHERE qrs.user_id = user_id_param 
  AND qrs.scanned_at > now() - INTERVAL '1 minute';
  
  IF recent_scan_count >= 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded. Please wait before scanning again.'
    );
  END IF;
  
  -- Validate user_id matches authenticated user
  IF user_id_param != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User validation failed'
    );
  END IF;
  
  -- Get QR code record with enhanced validation
  SELECT * INTO qr_record
  FROM public.gw_attendance_qr_codes 
  WHERE qr_token = qr_token_param 
  AND is_active = true 
  AND expires_at > now()
  AND created_at > now() - INTERVAL '24 hours'; -- Additional time bound
  
  IF NOT FOUND THEN
    -- Log failed scan attempt
    INSERT INTO public.gw_security_audit_log (
      user_id, action_type, resource_type, 
      details, ip_address, user_agent, created_at
    ) VALUES (
      user_id_param, 'qr_scan_failed', 'attendance_qr',
      jsonb_build_object('token', qr_token_param, 'reason', 'invalid_token'),
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
  
  -- Record the scan
  INSERT INTO public.gw_attendance_qr_scans (
    qr_code_id, user_id, scan_location, user_agent, ip_address
  ) VALUES (
    qr_record.id, user_id_param, scan_location_param, user_agent_param, ip_address_param
  );
  
  -- Update scan count
  UPDATE public.gw_attendance_qr_codes 
  SET scan_count = scan_count + 1
  WHERE id = qr_record.id;
  
  -- Create or update attendance record
  INSERT INTO public.gw_attendance (
    event_id, user_id, status, notes, created_at, updated_at
  ) VALUES (
    qr_record.event_id, user_id_param, 'present', 'Marked via QR scan', now(), now()
  )
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET 
    status = 'present',
    notes = COALESCE(gw_attendance.notes, '') || ' | QR scan at ' || now()::text,
    updated_at = now();
  
  -- Log successful scan
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id,
    details, ip_address, user_agent, created_at
  ) VALUES (
    user_id_param, 'qr_scan_success', 'attendance_qr', qr_record.event_id,
    jsonb_build_object('qr_code_id', qr_record.id, 'event_id', qr_record.event_id),
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
$$;