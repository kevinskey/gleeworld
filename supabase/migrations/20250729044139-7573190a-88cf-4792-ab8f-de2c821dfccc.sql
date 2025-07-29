-- Create Chaplain Work Hub database schema

-- 1. Spiritual Reflections & Journal Builder
CREATE TABLE public.gw_spiritual_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_id UUID REFERENCES public.gw_events(id),
  tags TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'members')),
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Prayer & Devotion Rotation Tool
CREATE TABLE public.gw_prayer_rotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  assigned_date DATE,
  assigned_event_id UUID REFERENCES public.gw_events(id),
  role_type TEXT NOT NULL CHECK (role_type IN ('prayer', 'scripture', 'meditation', 'song')),
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Wellness Check-In Panel
CREATE TABLE public.gw_wellness_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- Optional for anonymous submissions
  wellness_status TEXT NOT NULL CHECK (wellness_status IN ('balanced', 'overwhelmed', 'disconnected', 'great')),
  spiritual_reflection TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  private_notes TEXT, -- Only visible to chaplain
  follow_up_needed BOOLEAN DEFAULT false,
  submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Liturgical Planning Module
CREATE TABLE public.gw_liturgical_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  worship_type TEXT NOT NULL,
  scripture_reading TEXT,
  reflection_leader_id UUID,
  music_selection_ids UUID[],
  program_pdf_url TEXT,
  prayer_outline_url TEXT,
  notes TEXT,
  synced_to_calendar BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Chaplain's Announcements
CREATE TABLE public.gw_chaplain_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT DEFAULT 'general' CHECK (announcement_type IN ('general', 'devotional', 'prayer_request', 'reminder')),
  target_audience TEXT DEFAULT 'members' CHECK (target_audience IN ('members', 'executive_board', 'both')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- daily, weekly, monthly
  media_urls TEXT[],
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Member Care & Community Building
CREATE TABLE public.gw_member_care_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  care_type TEXT NOT NULL CHECK (care_type IN ('birthday', 'prayer_request', 'grief_support', 'celebration', 'emergency_response')),
  title TEXT NOT NULL,
  description TEXT,
  care_date DATE NOT NULL,
  action_items TEXT[],
  completed_actions TEXT[],
  confidential_notes TEXT, -- Only visible to chaplain
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Chaplain Toolkit Resources
CREATE TABLE public.gw_chaplain_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('template', 'guide', 'calendar', 'handbook', 'prayer', 'liturgy')),
  category TEXT NOT NULL,
  file_url TEXT,
  content TEXT, -- For text-based resources
  is_editable BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_spiritual_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_prayer_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wellness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_liturgical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_chaplain_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_member_care_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_chaplain_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chaplain, assistant_chaplain, and admin access
CREATE POLICY "Chaplains can manage spiritual reflections" ON public.gw_spiritual_reflections
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Members can view published reflections" ON public.gw_spiritual_reflections
FOR SELECT USING (is_published = true AND visibility = 'members');

CREATE POLICY "Chaplains can manage prayer rotations" ON public.gw_prayer_rotations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Members can view their prayer assignments" ON public.gw_prayer_rotations
FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "Members can submit wellness check-ins" ON public.gw_wellness_checkins
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Chaplains can view all wellness check-ins" ON public.gw_wellness_checkins
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Chaplains can update wellness check-ins" ON public.gw_wellness_checkins
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Chaplains can manage liturgical events" ON public.gw_liturgical_events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Chaplains can manage announcements" ON public.gw_chaplain_announcements
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Members can view published announcements" ON public.gw_chaplain_announcements
FOR SELECT USING (
  is_published = true AND 
  (target_audience = 'members' OR target_audience = 'both')
);

CREATE POLICY "Executive board can view board announcements" ON public.gw_chaplain_announcements
FOR SELECT USING (
  is_published = true AND 
  (target_audience = 'executive_board' OR target_audience = 'both') AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Chaplains can manage member care records" ON public.gw_member_care_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Chaplains can manage resources" ON public.gw_chaplain_resources
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position IN ('chaplain', 'assistant_chaplain')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add update triggers for timestamp updates
CREATE TRIGGER update_spiritual_reflections_updated_at
  BEFORE UPDATE ON public.gw_spiritual_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

CREATE TRIGGER update_prayer_rotations_updated_at
  BEFORE UPDATE ON public.gw_prayer_rotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

CREATE TRIGGER update_liturgical_events_updated_at
  BEFORE UPDATE ON public.gw_liturgical_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

CREATE TRIGGER update_chaplain_announcements_updated_at
  BEFORE UPDATE ON public.gw_chaplain_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

CREATE TRIGGER update_member_care_records_updated_at
  BEFORE UPDATE ON public.gw_member_care_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

CREATE TRIGGER update_chaplain_resources_updated_at
  BEFORE UPDATE ON public.gw_chaplain_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();