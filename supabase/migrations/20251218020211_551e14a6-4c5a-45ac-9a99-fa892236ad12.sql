-- Create tour roster table to track which members are going on tour
CREATE TABLE public.gw_tour_roster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.gw_tour_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'declined', 'waitlist')),
  notes TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

-- Enable RLS
ALTER TABLE public.gw_tour_roster ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and exec board can manage tour roster"
ON public.gw_tour_roster
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

CREATE POLICY "Members can view tour roster"
ON public.gw_tour_roster
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_gw_tour_roster_updated_at
BEFORE UPDATE ON public.gw_tour_roster
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();