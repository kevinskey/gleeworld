
-- Create room assignments table linking hotels to member assignments
CREATE TABLE public.gw_room_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES public.gw_tour_hotels(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor TEXT,
  room_type TEXT DEFAULT 'standard', -- standard, suite, accessible, etc.
  max_occupants INTEGER DEFAULT 2,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room occupants junction table
CREATE TABLE public.gw_room_occupants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_assignment_id UUID NOT NULL REFERENCES public.gw_room_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: a member can only be in one room per hotel
CREATE UNIQUE INDEX idx_unique_occupant_per_room ON public.gw_room_occupants(room_assignment_id, user_id);

-- Enable RLS
ALTER TABLE public.gw_room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_room_occupants ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view room assignments
CREATE POLICY "Authenticated users can view room assignments"
ON public.gw_room_assignments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view room occupants"
ON public.gw_room_occupants FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins and exec board can manage room assignments
CREATE POLICY "Admins and exec board can manage room assignments"
ON public.gw_room_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
);

CREATE POLICY "Admins and exec board can manage room occupants"
ON public.gw_room_occupants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_gw_room_assignments_updated_at
BEFORE UPDATE ON public.gw_room_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
