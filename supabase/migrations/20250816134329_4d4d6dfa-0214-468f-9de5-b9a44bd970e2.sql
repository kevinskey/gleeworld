-- First-Year Hub Tables

-- Cohorts table to group first-year students
CREATE TABLE public.fy_cohorts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    coordinator_id UUID REFERENCES auth.users(id),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- First-year students table
CREATE TABLE public.fy_students (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES public.fy_cohorts(id) ON DELETE CASCADE,
    student_id TEXT,
    voice_part TEXT,
    academic_status TEXT DEFAULT 'active',
    mentor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, cohort_id)
);

-- Check-ins table for weekly progress tracking
CREATE TABLE public.fy_checkins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.fy_students(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    academic_progress TEXT,
    vocal_progress TEXT,
    challenges TEXT,
    goals TEXT,
    mentor_feedback TEXT,
    coordinator_notes TEXT,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Practice logs for tracking daily practice
CREATE TABLE public.fy_practice_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.fy_students(id) ON DELETE CASCADE,
    practice_date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    pieces_practiced TEXT[],
    focus_areas TEXT[],
    notes TEXT,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task submissions for assignments and milestones
CREATE TABLE public.fy_task_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.fy_students(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL, -- 'assignment', 'milestone', 'assessment'
    title TEXT NOT NULL,
    description TEXT,
    submission_url TEXT,
    submission_text TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed', 'approved'
    grade TEXT,
    feedback TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fy_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fy_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fy_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fy_practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fy_task_submissions ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_fy_coordinator()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fy_cohorts 
    WHERE coordinator_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_fy_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin', 'staff'))
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_fy_student_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.fy_students 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_cohort_match(cohort_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fy_students fs
    JOIN public.fy_cohorts fc ON fs.cohort_id = fc.id
    WHERE fs.user_id = auth.uid() 
    AND fc.id = cohort_id_param
  ) OR EXISTS (
    SELECT 1 FROM public.fy_cohorts 
    WHERE coordinator_id = auth.uid() 
    AND id = cohort_id_param
  );
$$;

-- RLS Policies for fy_cohorts
CREATE POLICY "Students can view their cohort"
ON public.fy_cohorts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.fy_students 
    WHERE cohort_id = fy_cohorts.id AND user_id = auth.uid()
  ) OR 
  coordinator_id = auth.uid() OR 
  public.is_fy_staff()
);

CREATE POLICY "Coordinators and staff can manage cohorts"
ON public.fy_cohorts FOR ALL
USING (coordinator_id = auth.uid() OR public.is_fy_staff())
WITH CHECK (coordinator_id = auth.uid() OR public.is_fy_staff());

-- RLS Policies for fy_students
CREATE POLICY "Students can view their own record and cohort members"
ON public.fy_students FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.fy_cohorts 
    WHERE coordinator_id = auth.uid() AND id = fy_students.cohort_id
  ) OR 
  public.is_fy_staff()
);

CREATE POLICY "Coordinators and staff can manage students"
ON public.fy_students FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fy_cohorts 
    WHERE coordinator_id = auth.uid() AND id = fy_students.cohort_id
  ) OR 
  public.is_fy_staff()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fy_cohorts 
    WHERE coordinator_id = auth.uid() AND id = fy_students.cohort_id
  ) OR 
  public.is_fy_staff()
);

-- RLS Policies for fy_checkins
CREATE POLICY "Students can manage their own checkins"
ON public.fy_checkins FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fy_students 
    WHERE id = fy_checkins.student_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fy_students 
    WHERE id = fy_checkins.student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Coordinators can manage checkins in their cohort"
ON public.fy_checkins FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fy_students fs
    JOIN public.fy_cohorts fc ON fs.cohort_id = fc.id
    WHERE fs.id = fy_checkins.student_id AND fc.coordinator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fy_students fs
    JOIN public.fy_cohorts fc ON fs.cohort_id = fc.id
    WHERE fs.id = fy_checkins.student_id AND fc.coordinator_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all checkins"
ON public.fy_checkins FOR SELECT
USING (public.is_fy_staff());

-- RLS Policies for fy_practice_logs
CREATE POLICY "Students can manage their own practice logs"
ON public.fy_practice_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fy_students 
    WHERE id = fy_practice_logs.student_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fy_students 
    WHERE id = fy_practice_logs.student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Coordinators can manage practice logs in their cohort"
ON public.fy_practice_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fy_students fs
    JOIN public.fy_cohorts fc ON fs.cohort_id = fc.id
    WHERE fs.id = fy_practice_logs.student_id AND fc.coordinator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fy_students fs
    JOIN public.fy_cohorts fc ON fs.cohort_id = fc.id
    WHERE fs.id = fy_practice_logs.student_id AND fc.coordinator_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all practice logs"
ON public.fy_practice_logs FOR SELECT
USING (public.is_fy_staff());

-- RLS Policies for fy_task_submissions
CREATE POLICY "Students can manage their own task submissions"
ON public.fy_task_submissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fy_students 
    WHERE id = fy_task_submissions.student_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fy_students 
    WHERE id = fy_task_submissions.student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Coordinators can manage task submissions in their cohort"
ON public.fy_task_submissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fy_students fs
    JOIN public.fy_cohorts fc ON fs.cohort_id = fc.id
    WHERE fs.id = fy_task_submissions.student_id AND fc.coordinator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fy_students fs
    JOIN public.fy_cohorts fc ON fs.cohort_id = fc.id
    WHERE fs.id = fy_task_submissions.student_id AND fc.coordinator_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all task submissions"
ON public.fy_task_submissions FOR SELECT
USING (public.is_fy_staff());

-- Update triggers
CREATE TRIGGER update_fy_cohorts_updated_at
    BEFORE UPDATE ON public.fy_cohorts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fy_students_updated_at
    BEFORE UPDATE ON public.fy_students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fy_checkins_updated_at
    BEFORE UPDATE ON public.fy_checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fy_practice_logs_updated_at
    BEFORE UPDATE ON public.fy_practice_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fy_task_submissions_updated_at
    BEFORE UPDATE ON public.fy_task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: Create demo cohort "First-Year 2025"
INSERT INTO public.fy_cohorts (
    name,
    academic_year,
    start_date,
    end_date,
    description,
    is_active
) VALUES (
    'First-Year 2025',
    '2024-2025',
    '2024-08-15',
    '2025-05-15',
    'Demo cohort for first-year Glee Club members in the 2024-2025 academic year',
    true
);