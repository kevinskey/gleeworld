
CREATE OR REPLACE FUNCTION public.generate_qr_attendance_token(
  p_event_id uuid,
  p_created_by uuid,
  p_expires_in_minutes integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_token text;
  v_expires_at timestamptz;
begin
  -- Generate a secure hex token
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;

  -- Deactivate any previous active tokens for this event
  UPDATE gw_attendance_qr_codes
  SET is_active = false, updated_at = now()
  WHERE event_id = p_event_id AND is_active = true;

  -- Insert into the CORRECT table that process_qr_attendance_scan reads from
  INSERT INTO gw_attendance_qr_codes (
    qr_token,
    event_id,
    generated_by,
    expires_at,
    is_active,
    context_type
  ) VALUES (
    v_token,
    p_event_id,
    p_created_by,
    v_expires_at,
    true,
    'event'
  );

  RETURN v_token;
exception when others then
  raise exception 'Failed to create QR token: %', SQLERRM;
end;
$$;
