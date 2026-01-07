-- Create syllabus templates table
CREATE TABLE IF NOT EXISTS public.gw_syllabus_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Course Syllabus',
  term TEXT,
  credits INTEGER DEFAULT 3,
  class_time TEXT,
  classroom TEXT,
  instructor_name TEXT,
  instructor_email TEXT,
  instructor_phone TEXT,
  instructor_office TEXT,
  office_hours TEXT,
  purpose TEXT,
  textbooks JSONB DEFAULT '[]'::jsonb,
  attendance_policy TEXT,
  late_assignment_policy TEXT,
  academic_honesty_policy TEXT,
  disability_statement TEXT,
  grading_scale JSONB DEFAULT '{"A": "90-100", "B": "80-89", "C": "70-79", "D": "60-69", "F": "Below 60"}'::jsonb,
  grading_breakdown JSONB DEFAULT '[]'::jsonb,
  weekly_schedule JSONB DEFAULT '[]'::jsonb,
  additional_policies JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create learning objectives table
CREATE TABLE IF NOT EXISTS public.gw_learning_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  syllabus_id UUID REFERENCES public.gw_syllabus_templates(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  objective_text TEXT NOT NULL,
  category TEXT DEFAULT 'knowledge',
  bloom_level TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_measurable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create course requirements table
CREATE TABLE IF NOT EXISTS public.gw_course_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  syllabus_id UUID REFERENCES public.gw_syllabus_templates(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  weight_percentage INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_syllabus_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_requirements ENABLE ROW LEVEL SECURITY;

-- Policies for all tables - authenticated users can view, admins can manage
CREATE POLICY "Authenticated can view syllabi" ON public.gw_syllabus_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage syllabi" ON public.gw_syllabus_templates FOR ALL USING (EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin') AND is_active = true));

CREATE POLICY "Authenticated can view objectives" ON public.gw_learning_objectives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage objectives" ON public.gw_learning_objectives FOR ALL USING (EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin') AND is_active = true));

CREATE POLICY "Authenticated can view requirements" ON public.gw_course_requirements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage requirements" ON public.gw_course_requirements FOR ALL USING (EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin') AND is_active = true));