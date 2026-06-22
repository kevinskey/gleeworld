-- Per-user personal calendar provisioning + helper for students to add
-- their own events without admin powers. The function is SECURITY DEFINER
-- so it can create the gw_calendars row regardless of who calls it; we
-- scope by auth.uid() internally.

CREATE OR REPLACE FUNCTION public.gw_get_or_create_personal_calendar()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_full_name text;
  v_calendar_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT tenant_id, full_name INTO v_tenant_id, v_full_name
  FROM public.gw_profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'no_tenant_for_user';
  END IF;

  -- Existing personal calendar (any one created by + named "My Calendar")
  SELECT id INTO v_calendar_id
  FROM public.gw_calendars
  WHERE created_by = v_user_id
    AND tenant_id = v_tenant_id
    AND name = 'My Calendar'
  LIMIT 1;
  IF v_calendar_id IS NOT NULL THEN
    RETURN v_calendar_id;
  END IF;

  INSERT INTO public.gw_calendars (name, description, color, is_visible, created_by, tenant_id)
  VALUES (
    'My Calendar',
    'Personal calendar for ' || COALESCE(v_full_name, 'this user'),
    '#0ea5e9',
    true,
    v_user_id,
    v_tenant_id
  )
  RETURNING id INTO v_calendar_id;

  RETURN v_calendar_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gw_get_or_create_personal_calendar() TO authenticated;
