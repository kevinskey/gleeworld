-- Create setup crew tables
CREATE TABLE public.gw_setup_crews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  crew_name TEXT NOT NULL,
  max_members INTEGER DEFAULT 8,
  coordinator_id UUID REFERENCES auth.users(id),
  notes TEXT,
  status TEXT DEFAULT 'active'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create setup crew members junction table
CREATE TABLE public.gw_setup_crew_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id UUID NOT NULL REFERENCES public.gw_setup_crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member'::text, -- 'leader', 'member'
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(crew_id, user_id)
);

-- Enable RLS
ALTER TABLE public.gw_setup_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_setup_crew_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for setup crews
CREATE POLICY "Setup crew coordinators and admins can manage crews"
ON public.gw_setup_crews
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND position = 'set_up_crew_manager'
    AND is_active = true
  )
);

CREATE POLICY "Everyone can view active setup crews"
ON public.gw_setup_crews
FOR SELECT
USING (status = 'active');

-- RLS Policies for setup crew members
CREATE POLICY "Coordinators and admins can manage crew members"
ON public.gw_setup_crew_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND position = 'set_up_crew_manager'
    AND is_active = true
  )
  OR
  user_id = auth.uid() -- Users can see their own assignments
);

CREATE POLICY "Users can view their own crew assignments"
ON public.gw_setup_crew_members
FOR SELECT
USING (user_id = auth.uid());

-- Create updated_at trigger for setup crews
CREATE OR REPLACE FUNCTION public.update_gw_setup_crews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_gw_setup_crews_updated_at
  BEFORE UPDATE ON public.gw_setup_crews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_setup_crews_updated_at();