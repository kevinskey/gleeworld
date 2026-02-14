CREATE OR REPLACE FUNCTION public.generate_rotating_qr_code(
  p_event_id uuid,
  p_created_by uuid,
  p_rotate_interval_seconds integer DEFAULT 60,
  p_time_window_enabled boolean DEFAULT false,
  p_time_window_minutes integer DEFAULT 15,
  p_geofence_enabled boolean DEFAULT false,
  p_geofence_latitude double precision DEFAULT NULL,
  p_geofence_longitude double precision DEFAULT NULL,
  p_geofence_radius_meters integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_id uuid;
  v_qr_token text;
  v_pin_code text;
  v_parent_id uuid;
  v_sequence integer;
  v_expires_at timestamptz;
  v_effective_expiry_minutes integer;
BEGIN
  -- Find existing parent QR or get the latest sequence
  SELECT id, COALESCE(rotation_sequence, 0) + 1
  INTO v_parent_id, v_sequence
  FROM gw_attendance_qr_codes
  WHERE event_id = p_event_id
    AND auto_rotate_enabled = true
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    v_sequence := 1;
  END IF;

  -- Deactivate previous QR codes for this event
  UPDATE gw_attendance_qr_codes
  SET is_active = false
  WHERE event_id = p_event_id AND is_active = true;

  -- Generate a secure random token
  v_qr_token := encode(gen_random_uuid()::text::bytea, 'hex') || '-' || extract(epoch from now())::text;
  
  -- Generate a 6-digit PIN code
  v_pin_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  IF p_time_window_enabled AND p_time_window_minutes > 0 THEN
    v_effective_expiry_minutes := p_time_window_minutes;
  ELSE
    v_effective_expiry_minutes := 30;
  END IF;
  
  IF v_effective_expiry_minutes < 5 THEN
    v_effective_expiry_minutes := 5;
  END IF;
  
  v_expires_at := now() + (v_effective_expiry_minutes || ' minutes')::interval;

  INSERT INTO gw_attendance_qr_codes (
    event_id, qr_token, generated_by, pin_code, is_active,
    auto_rotate_enabled, rotate_interval_seconds,
    time_window_enabled, time_window_minutes,
    geofence_enabled, geofence_latitude, geofence_longitude, geofence_radius_meters,
    parent_qr_id, rotation_sequence, expires_at
  ) VALUES (
    p_event_id, v_qr_token, p_created_by, v_pin_code, true,
    true, p_rotate_interval_seconds,
    p_time_window_enabled, p_time_window_minutes,
    p_geofence_enabled, p_geofence_latitude, p_geofence_longitude, p_geofence_radius_meters,
    CASE WHEN v_sequence > 1 THEN v_parent_id ELSE NULL END,
    v_sequence, v_expires_at
  )
  RETURNING id INTO v_qr_id;

  -- Return BOTH 'token' and 'qr_token' for backward compatibility
  RETURN jsonb_build_object(
    'success', true,
    'qr_id', v_qr_id,
    'token', v_qr_token,
    'qr_token', v_qr_token,
    'token_id', v_qr_id,
    'pin_code', v_pin_code,
    'expires_at', v_expires_at,
    'sequence', v_sequence,
    'time_window_minutes', v_effective_expiry_minutes
  );
END;
$$;