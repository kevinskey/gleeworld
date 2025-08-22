-- Enable realtime for messaging tables
ALTER TABLE public.gw_group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.gw_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.gw_message_groups REPLICA IDENTITY FULL;
ALTER TABLE public.gw_group_members REPLICA IDENTITY FULL;

-- Add these tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_message_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_group_members;