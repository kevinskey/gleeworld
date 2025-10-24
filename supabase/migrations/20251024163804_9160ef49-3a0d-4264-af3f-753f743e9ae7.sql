-- Enable realtime for group_updates_mus240 table
ALTER TABLE public.group_updates_mus240 REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_updates_mus240;

-- Enable realtime for member contributions table
ALTER TABLE public.group_update_member_contributions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_update_member_contributions;