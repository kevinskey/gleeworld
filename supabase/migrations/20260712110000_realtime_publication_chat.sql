-- The self-hosted stack's supabase_realtime publication was EMPTY, so
-- postgres_changes never fired for any table — group chat relied on it
-- exclusively to display sent/received messages ("i just entered a chat
-- it didnt show in the ui"). Add the chat tables; other realtime
-- consumers (events, announcements, attendance, …) degrade gracefully
-- via polling and can be added deliberately later.
DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_group_messages', 'gw_message_reactions', 'gw_group_members'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
    -- full replica identity so UPDATE/DELETE payloads carry old rows
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $do$;
