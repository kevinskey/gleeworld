-- =============================================
-- INSTRUCTOR-ONLY DISCUSSION ANALYTICS TABLES
-- Students have ZERO access to these tables
-- =============================================

-- A) Instructor Notes on Students
CREATE TABLE public.discussion_student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B) Post Analysis (AI/metrics per post)
CREATE TABLE public.discussion_post_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  discussion_id UUID NOT NULL,
  post_id UUID NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C) Aggregated Student Metrics Cache
CREATE TABLE public.discussion_student_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_discussion_student_notes_course ON public.discussion_student_notes(course_id);
CREATE INDEX idx_discussion_student_notes_student ON public.discussion_student_notes(student_id);
CREATE INDEX idx_discussion_post_analysis_course ON public.discussion_post_analysis(course_id);
CREATE INDEX idx_discussion_post_analysis_student ON public.discussion_post_analysis(student_id);
CREATE INDEX idx_discussion_student_metrics_course ON public.discussion_student_metrics(course_id);

-- Enable RLS on all tables
ALTER TABLE public.discussion_student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_post_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_student_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION: Check if user is instructor/admin
-- Prevents RLS recursion issues
-- =============================================
CREATE OR REPLACE FUNCTION public.is_course_instructor(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = check_user_id
    AND (is_admin = true OR is_super_admin = true)
  )
$$;

-- =============================================
-- RLS POLICIES: INSTRUCTOR-ONLY ACCESS
-- Students get NO access (not even to their own data)
-- =============================================

-- discussion_student_notes policies
CREATE POLICY "Instructors can view all notes"
  ON public.discussion_student_notes FOR SELECT
  TO authenticated
  USING (public.is_course_instructor(auth.uid()));

CREATE POLICY "Instructors can create notes"
  ON public.discussion_student_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_course_instructor(auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "Instructors can update own notes"
  ON public.discussion_student_notes FOR UPDATE
  TO authenticated
  USING (
    public.is_course_instructor(auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "Instructors can delete own notes"
  ON public.discussion_student_notes FOR DELETE
  TO authenticated
  USING (
    public.is_course_instructor(auth.uid())
    AND author_id = auth.uid()
  );

-- discussion_post_analysis policies
CREATE POLICY "Instructors can view post analysis"
  ON public.discussion_post_analysis FOR SELECT
  TO authenticated
  USING (public.is_course_instructor(auth.uid()));

CREATE POLICY "Instructors can create post analysis"
  ON public.discussion_post_analysis FOR INSERT
  TO authenticated
  WITH CHECK (public.is_course_instructor(auth.uid()));

CREATE POLICY "Instructors can update post analysis"
  ON public.discussion_post_analysis FOR UPDATE
  TO authenticated
  USING (public.is_course_instructor(auth.uid()));

-- discussion_student_metrics policies
CREATE POLICY "Instructors can view student metrics"
  ON public.discussion_student_metrics FOR SELECT
  TO authenticated
  USING (public.is_course_instructor(auth.uid()));

CREATE POLICY "Instructors can upsert student metrics"
  ON public.discussion_student_metrics FOR INSERT
  TO authenticated
  WITH CHECK (public.is_course_instructor(auth.uid()));

CREATE POLICY "Instructors can update student metrics"
  ON public.discussion_student_metrics FOR UPDATE
  TO authenticated
  USING (public.is_course_instructor(auth.uid()));