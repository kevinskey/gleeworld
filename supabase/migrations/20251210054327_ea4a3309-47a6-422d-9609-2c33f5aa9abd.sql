-- Update the trigger function to use 'admin' role instead of 'leader'
CREATE OR REPLACE FUNCTION public.add_gw_group_leader_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only insert if leader_id is not null
  IF NEW.leader_id IS NOT NULL THEN
    INSERT INTO public.gw_group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.leader_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;