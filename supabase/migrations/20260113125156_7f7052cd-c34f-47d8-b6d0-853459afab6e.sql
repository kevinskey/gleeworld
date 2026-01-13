-- Phase 2 Security Features: Auto-rotate, Time Windows, Geofencing

-- Add security columns to gw_attendance_qr_codes if they don't exist
DO $$ 
BEGIN
  -- Auto-rotate settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'auto_rotate_enabled') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN auto_rotate_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'rotate_interval_seconds') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN rotate_interval_seconds integer DEFAULT 60;
  END IF;
  
  -- Time window settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'time_window_enabled') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN time_window_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'time_window_minutes') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN time_window_minutes integer DEFAULT 15;
  END IF;
  
  -- Geofence settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'geofence_enabled') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN geofence_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'geofence_latitude') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN geofence_latitude double precision;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'geofence_longitude') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN geofence_longitude double precision;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'geofence_radius_meters') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN geofence_radius_meters integer DEFAULT 100;
  END IF;
  
  -- Rotation tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'parent_qr_id') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN parent_qr_id uuid REFERENCES public.gw_attendance_qr_codes(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_attendance_qr_codes' AND column_name = 'rotation_sequence') THEN
    ALTER TABLE public.gw_attendance_qr_codes ADD COLUMN rotation_sequence integer DEFAULT 0;
  END IF;
END $$;

-- Add venue coordinates to gw_events if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_events' AND column_name = 'venue_latitude') THEN
    ALTER TABLE public.gw_events ADD COLUMN venue_latitude double precision;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_events' AND column_name = 'venue_longitude') THEN
    ALTER TABLE public.gw_events ADD COLUMN venue_longitude double precision;
  END IF;
END $$;

-- Create the generate_rotating_qr_code function
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
  v_token text;
  v_pin_code text;
  v_token_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Generate unique token and PIN
  v_token := encode(gen_random_bytes(32), 'hex');
  v_pin_code := lpad((floor(random() * 1000000)::int)::text, 6, '0');
  v_expires_at := now() + (p_rotate_interval_seconds || ' seconds')::interval;
  
  -- Deactivate previous QR codes for this event
  UPDATE public.gw_attendance_qr_codes
  SET is_active = false
  WHERE event_id = p_event_id AND is_active = true;
  
  -- Insert new QR code with security settings
  INSERT INTO public.gw_attendance_qr_codes (
    event_id,
    token,
    pin_code,
    created_by,
    expires_at,
    is_active,
    auto_rotate_enabled,
    rotate_interval_seconds,
    time_window_enabled,
    time_window_minutes,
    geofence_enabled,
    geofence_latitude,
    geofence_longitude,
    geofence_radius_meters,
    rotation_sequence
  ) VALUES (
    p_event_id,
    v_token,
    v_pin_code,
    p_created_by,
    v_expires_at,
    true,
    p_rotate_interval_seconds < 3600,
    p_rotate_interval_seconds,
    p_time_window_enabled,
    p_time_window_minutes,
    p_geofence_enabled,
    p_geofence_latitude,
    p_geofence_longitude,
    p_geofence_radius_meters,
    COALESCE((SELECT MAX(rotation_sequence) + 1 FROM public.gw_attendance_qr_codes WHERE event_id = p_event_id), 1)
  )
  RETURNING id INTO v_token_id;
  
  RETURN jsonb_build_object(
    'token', v_token,
    'pin_code', v_pin_code,
    'token_id', v_token_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- Create security validation function with Haversine formula for geofencing
CREATE OR REPLACE FUNCTION public.validate_attendance_security(
  p_qr_id uuid,
  p_user_latitude double precision DEFAULT NULL,
  p_user_longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr record;
  v_event record;
  v_distance_meters double precision;
  v_earth_radius_meters constant double precision := 6371000;
BEGIN
  -- Get QR code settings
  SELECT * INTO v_qr FROM public.gw_attendance_qr_codes WHERE id = p_qr_id;
  
  IF v_qr IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'QR code not found');
  END IF;
  
  IF NOT v_qr.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'QR code is no longer active');
  END IF;
  
  IF v_qr.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'QR code has expired');
  END IF;
  
  -- Time window validation
  IF v_qr.time_window_enabled THEN
    SELECT * INTO v_event FROM public.gw_events WHERE id = v_qr.event_id;
    
    IF v_event IS NOT NULL AND v_event.start_date IS NOT NULL THEN
      DECLARE
        v_event_start timestamptz;
        v_window_start timestamptz;
        v_window_end timestamptz;
      BEGIN
        v_event_start := v_event.start_date::timestamptz;
        v_window_start := v_event_start - (v_qr.time_window_minutes || ' minutes')::interval;
        v_window_end := v_event_start + (v_qr.time_window_minutes || ' minutes')::interval;
        
        IF now() < v_window_start OR now() > v_window_end THEN
          RETURN jsonb_build_object(
            'valid', false, 
            'error', 'Check-in is only allowed within ' || v_qr.time_window_minutes || ' minutes of event start'
          );
        END IF;
      END;
    END IF;
  END IF;
  
  -- Geofence validation using Haversine formula
  IF v_qr.geofence_enabled AND v_qr.geofence_latitude IS NOT NULL AND v_qr.geofence_longitude IS NOT NULL THEN
    IF p_user_latitude IS NULL OR p_user_longitude IS NULL THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Location is required for this check-in');
    END IF;
    
    -- Haversine formula
    v_distance_meters := v_earth_radius_meters * 2 * asin(
      sqrt(
        power(sin(radians(p_user_latitude - v_qr.geofence_latitude) / 2), 2) +
        cos(radians(v_qr.geofence_latitude)) * cos(radians(p_user_latitude)) *
        power(sin(radians(p_user_longitude - v_qr.geofence_longitude) / 2), 2)
      )
    );
    
    IF v_distance_meters > v_qr.geofence_radius_meters THEN
      RETURN jsonb_build_object(
        'valid', false, 
        'error', 'You must be within ' || v_qr.geofence_radius_meters || ' meters of the venue',
        'distance', round(v_distance_meters::numeric, 0)
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object('valid', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_rotating_qr_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_attendance_security TO authenticated;