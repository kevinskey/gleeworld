-- Create messages table for internal member communications
CREATE TABLE IF NOT EXISTS public.gw_internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_internal_messages ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_gw_internal_messages_created_at ON public.gw_internal_messages(created_at DESC);
CREATE INDEX idx_gw_internal_messages_user_id ON public.gw_internal_messages(user_id);

-- RLS Policy: Only members can view messages
CREATE POLICY "Members can view all internal messages"
ON public.gw_internal_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role IN ('member', 'admin', 'super-admin', 'executive')
  )
);

-- RLS Policy: Only members can create messages
CREATE POLICY "Members can create internal messages"
ON public.gw_internal_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role IN ('member', 'admin', 'super-admin', 'executive')
  )
);

-- RLS Policy: Users can update their own messages
CREATE POLICY "Users can update their own messages"
ON public.gw_internal_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.gw_internal_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_gw_internal_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_gw_internal_messages_updated_at
BEFORE UPDATE ON public.gw_internal_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_gw_internal_messages_updated_at();

-- Enable realtime
ALTER TABLE public.gw_internal_messages REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_internal_messages;