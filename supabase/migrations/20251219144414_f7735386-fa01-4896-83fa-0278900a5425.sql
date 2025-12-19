-- Fix current counts
UPDATE public.messenger_groups g
SET member_count = (
  SELECT COUNT(*) FROM public.messenger_group_members m WHERE m.group_id = g.id
);

-- Create function to auto-update member count
CREATE OR REPLACE FUNCTION public.update_messenger_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.messenger_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.messenger_groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic count updates
DROP TRIGGER IF EXISTS trigger_update_messenger_group_member_count ON public.messenger_group_members;
CREATE TRIGGER trigger_update_messenger_group_member_count
AFTER INSERT OR DELETE ON public.messenger_group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_messenger_group_member_count();