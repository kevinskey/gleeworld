-- =============================================
-- UNIVERSAL AI-ASSISTED GRADING SYSTEM
-- AI assists evaluation. Faculty performs assessment.
-- Students experience grading—not automation.
-- =============================================

-- 1. AI DRAFT GRADES TABLE (Internal Only - Never shown to students)
CREATE TABLE public.gw_ai_draft_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  
  -- AI Pre-Scores (Internal)
  ai_total_score NUMERIC(5,2),
  ai_max_score NUMERIC(5,2),
  ai_percentage NUMERIC(5,2),
  ai_letter_grade TEXT,
  
  -- AI Criterion Scores (Internal JSON)
  ai_criteria_scores JSONB DEFAULT '[]'::jsonb,
  -- Format: [{criterion_name, points_earned, max_points, evidence, feedback}]
  
  -- AI Feedback Drafts (Internal)
  ai_overall_feedback TEXT,
  ai_strengths TEXT,
  ai_improvements TEXT,
  
  -- AI Detection (Internal Only - NEVER shown to students)
  ai_detection_flagged BOOLEAN DEFAULT false,
  ai_detection_confidence TEXT, -- 'low', 'medium', 'high'
  ai_detection_indicators JSONB DEFAULT '[]'::jsonb,
  ai_detection_reasoning TEXT,
  
  -- Workflow Status
  status TEXT DEFAULT 'pending_review', -- pending_review, approved, rejected, modified
  instructor_reviewed_at TIMESTAMP WITH TIME ZONE,
  instructor_id UUID,
  instructor_notes TEXT, -- Private notes for instructor
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - ONLY instructors/admins can see AI drafts
ALTER TABLE public.gw_ai_draft_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only instructors see AI drafts"
ON public.gw_ai_draft_grades FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

CREATE INDEX idx_ai_draft_grades_submission ON public.gw_ai_draft_grades(submission_id);
CREATE INDEX idx_ai_draft_grades_assignment ON public.gw_ai_draft_grades(assignment_id);
CREATE INDEX idx_ai_draft_grades_course ON public.gw_ai_draft_grades(course_id);
CREATE INDEX idx_ai_draft_grades_status ON public.gw_ai_draft_grades(status);

-- 2. INSTRUCTOR FINAL GRADES TABLE (What students see)
CREATE TABLE public.gw_final_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  ai_draft_id UUID REFERENCES public.gw_ai_draft_grades(id),
  
  -- Final Scores (Instructor-Approved)
  total_score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  letter_grade TEXT NOT NULL,
  
  -- Final Criterion Scores (Instructor-Edited)
  criteria_scores JSONB DEFAULT '[]'::jsonb,
  
  -- Final Feedback (Instructor-Authored Voice)
  overall_feedback TEXT,
  instructor_comment TEXT,
  
  -- Approval Record
  graded_by UUID NOT NULL,
  graded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_final_grades ENABLE ROW LEVEL SECURITY;

-- Students can only see their own PUBLISHED grades
CREATE POLICY "Students see own published grades"
ON public.gw_final_grades FOR SELECT
USING (
  (student_id = auth.uid() AND is_published = true)
  OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

-- Only instructors can manage grades
CREATE POLICY "Instructors manage grades"
ON public.gw_final_grades FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

CREATE INDEX idx_final_grades_submission ON public.gw_final_grades(submission_id);
CREATE INDEX idx_final_grades_student ON public.gw_final_grades(student_id);
CREATE INDEX idx_final_grades_assignment ON public.gw_final_grades(assignment_id);
CREATE INDEX idx_final_grades_course ON public.gw_final_grades(course_id);
CREATE INDEX idx_final_grades_published ON public.gw_final_grades(is_published);

-- 3. UNIVERSAL ASSIGNMENT RUBRICS TABLE
CREATE TABLE public.gw_universal_rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID,
  course_id UUID REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  
  -- Rubric Metadata
  name TEXT NOT NULL,
  description TEXT,
  total_points INTEGER NOT NULL DEFAULT 100,
  
  -- Criteria (Visible to students)
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: [{id, name, description, max_points, display_order}]
  
  -- Settings
  is_visible_before_submission BOOLEAN DEFAULT true,
  is_visible_after_grading BOOLEAN DEFAULT true,
  
  -- Ownership
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_universal_rubrics ENABLE ROW LEVEL SECURITY;

-- Anyone can view rubrics (they're educational tools)
CREATE POLICY "Anyone can view rubrics"
ON public.gw_universal_rubrics FOR SELECT
USING (true);

CREATE POLICY "Instructors manage rubrics"
ON public.gw_universal_rubrics FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

CREATE INDEX idx_universal_rubrics_assignment ON public.gw_universal_rubrics(assignment_id);
CREATE INDEX idx_universal_rubrics_course ON public.gw_universal_rubrics(course_id);

-- 4. INSERT THE FOURTH TURNING ESSAY RUBRIC (EXAMPLE)
INSERT INTO public.gw_universal_rubrics (
  course_id,
  name,
  description,
  total_points,
  criteria,
  created_by
) VALUES (
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', -- MUS 240
  'Fourth Turning Music Analysis Rubric',
  'Rubric for analyzing music through the Fourth Turning framework (1946-present)',
  100,
  '[
    {
      "id": "fourth_turning_understanding",
      "name": "Fourth Turning Understanding",
      "description": "Accuracy in explaining and applying the Fourth Turning framework (High, Awakening, Unraveling, Crisis) from 1946–present.",
      "max_points": 20,
      "display_order": 1
    },
    {
      "id": "historical_timeline",
      "name": "Historical Timeline Accuracy",
      "description": "Correct placement of musical developments within post-1946 historical periods.",
      "max_points": 20,
      "display_order": 2
    },
    {
      "id": "music_history_connection",
      "name": "Music–History Connection",
      "description": "Clear explanation of how music reflects, anticipates, or shapes each Turning.",
      "max_points": 25,
      "display_order": 3
    },
    {
      "id": "comparative_insight",
      "name": "Comparative Insight",
      "description": "Comparison between the Civil Rights Crisis era and the current Crisis period.",
      "max_points": 20,
      "display_order": 4
    },
    {
      "id": "clarity_organization",
      "name": "Clarity & Organization",
      "description": "Clear thesis, logical structure, concise academic writing within word limit.",
      "max_points": 15,
      "display_order": 5
    }
  ]'::jsonb,
  NULL
);

-- 5. Triggers for updated_at
CREATE TRIGGER update_gw_ai_draft_grades_updated_at
BEFORE UPDATE ON public.gw_ai_draft_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_course_infrastructure_updated_at();

CREATE TRIGGER update_gw_final_grades_updated_at
BEFORE UPDATE ON public.gw_final_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_course_infrastructure_updated_at();

CREATE TRIGGER update_gw_universal_rubrics_updated_at
BEFORE UPDATE ON public.gw_universal_rubrics
FOR EACH ROW
EXECUTE FUNCTION public.update_course_infrastructure_updated_at();