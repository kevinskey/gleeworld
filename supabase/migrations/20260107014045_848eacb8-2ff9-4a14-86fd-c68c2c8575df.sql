-- Create tour_milestones table to store milestone data across users
CREATE TABLE public.tour_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  signed_off_by TEXT,
  sign_off_date TIMESTAMPTZ,
  synopsis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tour_milestones ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view milestones
CREATE POLICY "Authenticated users can view tour milestones"
ON public.tour_milestones
FOR SELECT
TO authenticated
USING (true);

-- Admins and tour managers can manage milestones
CREATE POLICY "Admins can manage tour milestones"
ON public.tour_milestones
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role IN ('admin', 'superadmin', 'tour_manager', 'executive')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role IN ('admin', 'superadmin', 'tour_manager', 'executive')
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_milestones;

-- Create updated_at trigger
CREATE TRIGGER update_tour_milestones_updated_at
BEFORE UPDATE ON public.tour_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();