-- Ensure pgcrypto is available for secure random bytes
create extension if not exists pgcrypto with schema extensions;

-- Fix generate_qr_attendance_token to use extensions.gen_random_bytes and URL-safe encoding
create or replace function public.generate_qr_attendance_token(
  p_event_id uuid,
  p_created_by uuid,
  p_expires_in_minutes integer default 30
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_expires_at timestamptz;
begin
  -- Generate a secure, URL-safe token (hex is URL-safe)
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Calculate expiration time
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;

  -- Insert token record
  insert into qr_attendance_tokens (
    token,
    event_id,
    created_by,
    expires_at,
    is_active
  ) values (
    v_token,
    p_event_id,
    p_created_by,
    v_expires_at,
    true
  );

  return v_token;
exception when others then
  raise exception 'Failed to create QR token: %', SQLERRM;
end;
$$;