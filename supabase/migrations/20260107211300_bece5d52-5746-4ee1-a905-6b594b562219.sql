-- Create gw_semesters table to store academic semester configurations
CREATE TABLE IF NOT EXISTS public.gw_semesters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  term TEXT NOT NULL, -- 'Fall', 'Spring', 'Summer'
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  classes_end_date DATE, -- Last day of regular classes
  finals_start DATE,
  finals_end DATE,
  is_active BOOLEAN DEFAULT false,
  exception_dates JSONB DEFAULT '[]'::jsonb, -- Array of dates with no classes
  academic_events JSONB DEFAULT '[]'::jsonb, -- Academic calendar events like holidays
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(term, year)
);

-- Enable RLS
ALTER TABLE public.gw_semesters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view semesters" ON public.gw_semesters FOR SELECT USING (true);
CREATE POLICY "Admins can manage semesters" ON public.gw_semesters FOR ALL 
  USING (EXISTS (SELECT 1 FROM app_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin') AND is_active = true));

-- Insert Spring 2026 semester with Spelman academic calendar
INSERT INTO public.gw_semesters (name, term, year, start_date, end_date, classes_end_date, finals_start, finals_end, is_active, exception_dates, academic_events)
VALUES (
  'Spring 2026',
  'Spring',
  2026,
  '2026-01-14',
  '2026-05-08',
  '2026-04-29',
  '2026-05-04',
  '2026-05-08',
  true,
  '["2026-01-19", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-04-03", "2026-04-09", "2026-04-17"]'::jsonb,
  '[
    {"title": "MLK Jr. Day - Campus Closed", "date": "2026-01-19", "type": "holiday"},
    {"title": "Spring Break", "start_date": "2026-03-09", "end_date": "2026-03-13", "type": "break"},
    {"title": "Good Friday - No Classes", "date": "2026-04-03", "type": "holiday"},
    {"title": "Founders Day Observed", "date": "2026-04-09", "type": "holiday"},
    {"title": "Research Day", "date": "2026-04-17", "type": "academic"},
    {"title": "Last Day of Classes", "date": "2026-04-29", "type": "academic"},
    {"title": "Reading Period", "start_date": "2026-04-30", "end_date": "2026-05-01", "type": "academic"},
    {"title": "Final Exams", "start_date": "2026-05-04", "end_date": "2026-05-08", "type": "academic"}
  ]'::jsonb
) ON CONFLICT (term, year) DO UPDATE SET
  exception_dates = EXCLUDED.exception_dates,
  academic_events = EXCLUDED.academic_events,
  is_active = EXCLUDED.is_active;

-- Add semester_id to courses for linking
ALTER TABLE public.gw_courses ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.gw_semesters(id);

-- Update existing courses to link to Spring 2026 semester
UPDATE public.gw_courses 
SET semester_id = (SELECT id FROM public.gw_semesters WHERE term = 'Spring' AND year = 2026 LIMIT 1)
WHERE term = 'Spring 2026' OR semester = 'Spring 2026';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gw_semesters_active ON public.gw_semesters(is_active);
CREATE INDEX IF NOT EXISTS idx_gw_courses_semester ON public.gw_courses(semester_id);