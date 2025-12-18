-- Create tour crew assignments table
CREATE TABLE public.gw_tour_crew (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crew_type TEXT NOT NULL CHECK (crew_type IN ('merch', 'setup')),
  tour_id UUID REFERENCES public.gw_tour_events(id) ON DELETE CASCADE,
  role TEXT,
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, crew_type, tour_id)
);

-- Create tour crew tasks table
CREATE TABLE public.gw_tour_crew_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  crew_type TEXT NOT NULL CHECK (crew_type IN ('merch', 'setup')),
  tour_id UUID REFERENCES public.gw_tour_events(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tour crew meetings table
CREATE TABLE public.gw_tour_crew_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  crew_type TEXT NOT NULL CHECK (crew_type IN ('merch', 'setup', 'both')),
  tour_id UUID REFERENCES public.gw_tour_events(id) ON DELETE CASCADE,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_virtual BOOLEAN DEFAULT false,
  meeting_link TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_tour_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_tour_crew_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_tour_crew_meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for gw_tour_crew
CREATE POLICY "Anyone authenticated can view tour crew"
ON public.gw_tour_crew FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and exec board can manage tour crew"
ON public.gw_tour_crew FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- RLS policies for gw_tour_crew_tasks
CREATE POLICY "Anyone authenticated can view crew tasks"
ON public.gw_tour_crew_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and exec board can manage crew tasks"
ON public.gw_tour_crew_tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- RLS policies for gw_tour_crew_meetings
CREATE POLICY "Anyone authenticated can view crew meetings"
ON public.gw_tour_crew_meetings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and exec board can manage crew meetings"
ON public.gw_tour_crew_meetings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);