-- Create pre-event excuse requests table
CREATE TABLE IF NOT EXISTS public.gw_pre_event_excuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.gw_events(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  documentation_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES public.gw_profiles(user_id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Prevent duplicate pre-event excuses for same user/event
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.gw_pre_event_excuses ENABLE ROW LEVEL SECURITY;

-- Users can manage their own pre-event excuses
CREATE POLICY "Users can manage their own pre-event excuses"
ON public.gw_pre_event_excuses
FOR ALL
USING (user_id = auth.uid());

-- Admins can manage all pre-event excuses
CREATE POLICY "Admins can manage all pre-event excuses"
ON public.gw_pre_event_excuses
FOR ALL
USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_gw_pre_event_excuses_updated_at
  BEFORE UPDATE ON public.gw_pre_event_excuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_attendance();

-- Add indexes for performance
CREATE INDEX idx_gw_pre_event_excuses_user_id ON public.gw_pre_event_excuses(user_id);
CREATE INDEX idx_gw_pre_event_excuses_event_id ON public.gw_pre_event_excuses(event_id);
CREATE INDEX idx_gw_pre_event_excuses_status ON public.gw_pre_event_excuses(status);