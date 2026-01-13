-- Enable pgcrypto extension (required for gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Drop and recreate the function with explicit schema reference
DROP FUNCTION IF EXISTS public.generate_rotating_qr_code(uuid, uuid, integer, boolean, integer, boolean, double precision, double precision, integer);

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
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_id uuid;
  v_qr_token text;
  v_parent_id uuid;
  v_sequence integer;
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

  -- If no parent, this is the first in the sequence
  IF v_parent_id IS NULL THEN
    v_sequence := 1;
  END IF;

  -- Deactivate previous QR codes for this event
  UPDATE gw_attendance_qr_codes
  SET is_active = false, expires_at = now()
  WHERE event_id = p_event_id AND is_active = true;

  -- Generate a secure random token using encode + gen_random_uuid
  v_qr_token := encode(gen_random_uuid()::text::bytea, 'hex') || '-' || extract(epoch from now())::text;

  -- Create the new QR code
  INSERT INTO gw_attendance_qr_codes (
    event_id,
    qr_token,
    created_by,
    is_active,
    auto_rotate_enabled,
    rotate_interval_seconds,
    time_window_enabled,
    time_window_minutes,
    geofence_enabled,
    geofence_latitude,
    geofence_longitude,
    geofence_radius_meters,
    parent_qr_id,
    rotation_sequence,
    expires_at
  ) VALUES (
    p_event_id,
    v_qr_token,
    p_created_by,
    true,
    true,
    p_rotate_interval_seconds,
    p_time_window_enabled,
    p_time_window_minutes,
    p_geofence_enabled,
    p_geofence_latitude,
    p_geofence_longitude,
    p_geofence_radius_meters,
    v_parent_id,
    v_sequence,
    now() + (p_rotate_interval_seconds || ' seconds')::interval
  )
  RETURNING id INTO v_qr_id;

  RETURN v_qr_id;
END;
$$;