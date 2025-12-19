-- Create function to sync exec board members to messenger group
CREATE OR REPLACE FUNCTION public.sync_exec_board_messenger_group()
RETURNS void AS $$
DECLARE
  exec_group_id UUID;
BEGIN
  -- Get or create Executive Board group
  SELECT id INTO exec_group_id FROM public.messenger_groups WHERE name = 'Executive Board' LIMIT 1;
  
  IF exec_group_id IS NULL THEN
    INSERT INTO public.messenger_groups (name, description, is_active)
    VALUES ('Executive Board', 'All executive board members', true)
    RETURNING id INTO exec_group_id;
  END IF;
  
  -- Add all exec board members who aren't already in the group
  INSERT INTO public.messenger_group_members (group_id, user_id, role)
  SELECT exec_group_id, p.user_id, 'member'
  FROM public.gw_profiles p
  WHERE p.is_exec_board = true
    AND NOT EXISTS (
      SELECT 1 FROM public.messenger_group_members m 
      WHERE m.group_id = exec_group_id AND m.user_id = p.user_id
    );
  
  -- Remove members who are no longer exec board
  DELETE FROM public.messenger_group_members m
  WHERE m.group_id = exec_group_id
    AND NOT EXISTS (
      SELECT 1 FROM public.gw_profiles p 
      WHERE p.user_id = m.user_id AND p.is_exec_board = true
    );
  
  -- Update member count
  UPDATE public.messenger_groups 
  SET member_count = (SELECT COUNT(*) FROM public.messenger_group_members WHERE group_id = exec_group_id)
  WHERE id = exec_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Run the sync now
SELECT public.sync_exec_board_messenger_group();

-- Create trigger to auto-sync when profile exec board status changes
CREATE OR REPLACE FUNCTION public.trigger_sync_exec_board_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.is_exec_board IS DISTINCT FROM NEW.is_exec_board)
     OR TG_OP = 'INSERT' THEN
    PERFORM public.sync_exec_board_messenger_group();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_exec_board_messenger ON public.gw_profiles;
CREATE TRIGGER trigger_sync_exec_board_messenger
AFTER INSERT OR UPDATE OF is_exec_board ON public.gw_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_exec_board_on_profile_change();