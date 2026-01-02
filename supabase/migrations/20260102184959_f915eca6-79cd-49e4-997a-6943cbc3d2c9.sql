-- Add missing fields to gw_courses for Spring 2026 scheduling
ALTER TABLE public.gw_courses 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS meeting_patterns JSONB,
ADD COLUMN IF NOT EXISTS default_location TEXT;

-- Create gw_course_sessions table (generated class meetings)
CREATE TABLE IF NOT EXISTS public.gw_course_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  session_index INTEGER NOT NULL,
  session_date DATE NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL DEFAULT 'Session',
  week_index INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'taught', 'canceled')),
  cancellation_reason TEXT,
  calendar_event_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gw_course_outline_items table (editable outline content)
CREATE TABLE IF NOT EXISTS public.gw_course_outline_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.gw_course_sessions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('objective', 'agenda', 'repertoire', 'reading', 'listening', 'activity', 'assignment', 'assessment', 'note', 'warmup', 'technique', 'discussion', 'homework')),
  content TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  link_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gw_course_templates table (outline scaffolds per course)
CREATE TABLE IF NOT EXISTS public.gw_course_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_sessions_course_id ON public.gw_course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_session_date ON public.gw_course_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_course_sessions_week_index ON public.gw_course_sessions(week_index);
CREATE INDEX IF NOT EXISTS idx_course_outline_items_course_id ON public.gw_course_outline_items(course_id);
CREATE INDEX IF NOT EXISTS idx_course_outline_items_session_id ON public.gw_course_outline_items(session_id);
CREATE INDEX IF NOT EXISTS idx_course_templates_course_id ON public.gw_course_templates(course_id);

-- Enable RLS
ALTER TABLE public.gw_course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_outline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_course_sessions
CREATE POLICY "Instructors can manage their course sessions"
ON public.gw_course_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_courses c
    WHERE c.id = course_id
    AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Enrolled students can view course sessions"
ON public.gw_course_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_course_enrollments e
    WHERE e.course_id = gw_course_sessions.course_id
    AND e.user_id = auth.uid()
  )
);

-- RLS Policies for gw_course_outline_items
CREATE POLICY "Instructors can manage outline items"
ON public.gw_course_outline_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_courses c
    WHERE c.id = course_id
    AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Enrolled students can view outline items"
ON public.gw_course_outline_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_course_enrollments e
    WHERE e.course_id = gw_course_outline_items.course_id
    AND e.user_id = auth.uid()
  )
);

-- RLS Policies for gw_course_templates
CREATE POLICY "Instructors can manage their course templates"
ON public.gw_course_templates
FOR ALL
USING (
  course_id IS NULL OR EXISTS (
    SELECT 1 FROM public.gw_courses c
    WHERE c.id = course_id
    AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Anyone can view templates"
ON public.gw_course_templates
FOR SELECT
USING (true);

-- Add course_id to gw_events for linking calendar events to courses
ALTER TABLE public.gw_events 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.gw_courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_gw_events_course_id ON public.gw_events(course_id);

-- Create trigger for updated_at on new tables
CREATE OR REPLACE FUNCTION public.update_course_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gw_course_sessions_updated_at ON public.gw_course_sessions;
CREATE TRIGGER update_gw_course_sessions_updated_at
  BEFORE UPDATE ON public.gw_course_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_course_tables_updated_at();

DROP TRIGGER IF EXISTS update_gw_course_outline_items_updated_at ON public.gw_course_outline_items;
CREATE TRIGGER update_gw_course_outline_items_updated_at
  BEFORE UPDATE ON public.gw_course_outline_items
  FOR EACH ROW EXECUTE FUNCTION public.update_course_tables_updated_at();

DROP TRIGGER IF EXISTS update_gw_course_templates_updated_at ON public.gw_course_templates;
CREATE TRIGGER update_gw_course_templates_updated_at
  BEFORE UPDATE ON public.gw_course_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_course_tables_updated_at();