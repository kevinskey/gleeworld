-- Phase 3: Performance and Production Layer

-- 1. Setlist Builder Tables
CREATE TABLE public.gw_setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  concert_name TEXT NOT NULL,
  event_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT,
  venue TEXT,
  rehearsal_notes TEXT
);

CREATE TABLE public.gw_setlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.gw_setlists(id) ON DELETE CASCADE,
  music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  voice_part_notes TEXT,
  tempo_notes TEXT,
  staging_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setlist_id, order_index)
);

-- 2. Tour Manager Tables
CREATE TABLE public.gw_tour_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  venue_contact TEXT,
  venue_phone TEXT,
  venue_email TEXT,
  setlist_id UUID REFERENCES public.gw_setlists(id),
  budget_allocated NUMERIC(10,2),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.gw_tour_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.gw_tour_events(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('travel', 'accommodation', 'meals', 'rehearsal', 'setup', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.gw_travel_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.gw_tour_events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,
  travel_mode TEXT NOT NULL CHECK (travel_mode IN ('bus', 'plane', 'car', 'train', 'other')),
  departure_location TEXT,
  departure_time TIMESTAMP WITH TIME ZONE,
  arrival_location TEXT,
  arrival_time TIMESTAMP WITH TIME ZONE,
  cost NUMERIC(10,2),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  booking_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Licensing & Usage Tracker Tables
CREATE TABLE public.gw_licensing_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL CHECK (license_type IN ('public_domain', 'ascap', 'bmi', 'sesac', 'custom', 'self_published', 'permission_required')),
  publisher TEXT,
  rights_holder TEXT,
  license_number TEXT,
  proof_url TEXT,
  expires_on DATE,
  usage_notes TEXT,
  performance_fee NUMERIC(10,2),
  territory_restrictions TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on all new tables
ALTER TABLE public.gw_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_setlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_tour_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_tour_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_licensing_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Setlists
CREATE POLICY "Members can view published setlists" 
ON public.gw_setlists 
FOR SELECT 
USING (
  is_published = true OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage setlists" 
ON public.gw_setlists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- RLS Policies for Setlist Items  
CREATE POLICY "Users can view setlist items for accessible setlists" 
ON public.gw_setlist_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_setlists s
    WHERE s.id = gw_setlist_items.setlist_id
    AND (s.is_published = true OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
    ))
  )
);

CREATE POLICY "Admins can manage setlist items" 
ON public.gw_setlist_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- RLS Policies for Tour Events
CREATE POLICY "Members can view tour events" 
ON public.gw_tour_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage tour events" 
ON public.gw_tour_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- RLS Policies for Tour Tasks
CREATE POLICY "Users can view tour tasks" 
ON public.gw_tour_tasks 
FOR SELECT 
USING (
  assignee_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

CREATE POLICY "Admins and assignees can manage tour tasks" 
ON public.gw_tour_tasks 
FOR ALL 
USING (
  assignee_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- RLS Policies for Travel Logs
CREATE POLICY "Users can view their own travel logs" 
ON public.gw_travel_logs 
FOR SELECT 
USING (
  person_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage travel logs" 
ON public.gw_travel_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- RLS Policies for Licensing Entries
CREATE POLICY "Members can view licensing entries for accessible music" 
ON public.gw_licensing_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_sheet_music sm
    WHERE sm.id = gw_licensing_entries.music_id
    AND user_can_access_sheet_music(sm.id, auth.uid())
  )
);

CREATE POLICY "Admins can manage licensing entries" 
ON public.gw_licensing_entries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_gw_setlists_updated_at
  BEFORE UPDATE ON public.gw_setlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_tour_events_updated_at
  BEFORE UPDATE ON public.gw_tour_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_tour_tasks_updated_at
  BEFORE UPDATE ON public.gw_tour_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_travel_logs_updated_at
  BEFORE UPDATE ON public.gw_travel_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_licensing_entries_updated_at
  BEFORE UPDATE ON public.gw_licensing_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_gw_setlist_items_setlist_order ON public.gw_setlist_items(setlist_id, order_index);
CREATE INDEX idx_gw_tour_tasks_event ON public.gw_tour_tasks(event_id);
CREATE INDEX idx_gw_tour_tasks_assignee ON public.gw_tour_tasks(assignee_id);
CREATE INDEX idx_gw_travel_logs_event ON public.gw_travel_logs(event_id);
CREATE INDEX idx_gw_travel_logs_person ON public.gw_travel_logs(person_id);
CREATE INDEX idx_gw_licensing_entries_music ON public.gw_licensing_entries(music_id);
CREATE INDEX idx_gw_licensing_entries_expires ON public.gw_licensing_entries(expires_on) WHERE expires_on IS NOT NULL;

-- Function to get upcoming license expirations
CREATE OR REPLACE FUNCTION public.get_upcoming_license_expirations(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
  id UUID,
  music_title TEXT,
  license_type TEXT,
  expires_on DATE,
  days_until_expiry INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    le.id,
    sm.title as music_title,
    le.license_type,
    le.expires_on,
    (le.expires_on - CURRENT_DATE) as days_until_expiry
  FROM public.gw_licensing_entries le
  JOIN public.gw_sheet_music sm ON sm.id = le.music_id
  WHERE le.is_active = true
    AND le.expires_on IS NOT NULL
    AND le.expires_on <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND le.expires_on >= CURRENT_DATE
  ORDER BY le.expires_on ASC;
$$;