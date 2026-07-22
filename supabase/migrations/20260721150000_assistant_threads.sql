-- Persistent chat threads for the GleeWorld Assistant.
-- Layer 2 of the assistant-memory work: each user has one or more threads,
-- and every user + assistant turn is stored so the assistant remembers the
-- conversation across page refreshes, tabs, and devices.
--
-- Long-term memories (Layer 3 — facts extracted across sessions) will live
-- in a separate `gw_assistant_memories` table; this migration is chat
-- history only.

CREATE TABLE public.gw_assistant_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Auto-set from the first user message on first save; nullable so the
  -- edge function can insert the row before the reply is known.
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Soft-delete so "Clear conversation" hides without cascading a message
  -- purge — you can restore if you regret it.
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Most reads are "give me this user's threads, most recent first" for the
-- thread picker, and "resume my last active thread" on cold start.
CREATE INDEX gw_assistant_threads_user_idx
  ON public.gw_assistant_threads (user_id, archived_at NULLS FIRST, updated_at DESC);

ALTER TABLE public.gw_assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads"
  ON public.gw_assistant_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own threads"
  ON public.gw_assistant_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own threads"
  ON public.gw_assistant_threads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own threads"
  ON public.gw_assistant_threads FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_gw_assistant_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_assistant_threads_updated_at_trigger
  BEFORE UPDATE ON public.gw_assistant_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_gw_assistant_threads_updated_at();

-- Messages inside a thread. Denormalized user_id lets RLS check ownership
-- without a join to threads on every read/write — matters because the edge
-- function does a bulk insert per turn and we want it cheap.
CREATE TABLE public.gw_assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.gw_assistant_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX gw_assistant_messages_thread_idx
  ON public.gw_assistant_messages (thread_id, created_at ASC);

ALTER TABLE public.gw_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.gw_assistant_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages"
  ON public.gw_assistant_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages"
  ON public.gw_assistant_messages FOR DELETE USING (auth.uid() = user_id);
