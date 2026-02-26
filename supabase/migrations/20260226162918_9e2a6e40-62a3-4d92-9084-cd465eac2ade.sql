
-- Unified operational timeline for tour logistics
CREATE TABLE public.gw_tour_timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.gw_tours(id) ON DELETE CASCADE,
  city_id UUID REFERENCES public.gw_tour_cities(id) ON DELETE SET NULL,
  event_category TEXT NOT NULL DEFAULT 'general',
  -- Categories: call_time, transport, sound_check, performance, meal, merch, crew, load_in, load_out, general
  label TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  end_time TIME,
  target_group TEXT DEFAULT 'all',
  -- Groups: all, singers, first_year, crew, merch_team, setup_crew, route_manager
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending, confirmed, completed, cancelled
  location TEXT,
  assigned_to TEXT[],
  is_auto_generated BOOLEAN DEFAULT false,
  source_module TEXT,
  -- Source: manual, routes, hotels, roster
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tour_timeline_tour ON public.gw_tour_timeline_events(tour_id);
CREATE INDEX idx_tour_timeline_date ON public.gw_tour_timeline_events(event_date, event_time);
CREATE INDEX idx_tour_timeline_category ON public.gw_tour_timeline_events(event_category);

-- Enable RLS
ALTER TABLE public.gw_tour_timeline_events ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read
CREATE POLICY "Authenticated users can view timeline events"
  ON public.gw_tour_timeline_events FOR SELECT
  TO authenticated
  USING (true);

-- Admins/creators can insert
CREATE POLICY "Authenticated users can create timeline events"
  ON public.gw_tour_timeline_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Admins/creators can update
CREATE POLICY "Creators can update timeline events"
  ON public.gw_tour_timeline_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
  ));

-- Admins/creators can delete
CREATE POLICY "Creators can delete timeline events"
  ON public.gw_tour_timeline_events FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
  ));

-- Updated_at trigger
CREATE TRIGGER update_tour_timeline_events_updated_at
  BEFORE UPDATE ON public.gw_tour_timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
