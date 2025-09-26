-- Create tables for the grading system
CREATE TABLE public.mus240_grading_rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_type TEXT NOT NULL, -- 'term_definition', 'listening_analysis', 'essay'
  question_id TEXT NOT NULL, -- maps to specific questions
  criteria JSONB NOT NULL, -- grading criteria with point values
  total_points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.mus240_submission_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES mus240_midterm_submissions(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question_id TEXT NOT NULL,
  student_answer TEXT,
  ai_score NUMERIC(4,2), -- AI-generated score
  ai_feedback TEXT, -- AI-generated feedback
  instructor_score NUMERIC(4,2), -- Final instructor score
  instructor_feedback TEXT, -- Instructor feedback
  rubric_breakdown JSONB, -- Detailed scoring breakdown
  needs_review BOOLEAN DEFAULT true,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES auth.users(id),
  ai_graded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mus240_grading_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_submission_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rubrics
CREATE POLICY "Instructors can manage rubrics" ON public.mus240_grading_rubrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Everyone can view rubrics" ON public.mus240_grading_rubrics
  FOR SELECT USING (true);

-- RLS Policies for grades
CREATE POLICY "Instructors can manage all grades" ON public.mus240_submission_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Students can view their own grades" ON public.mus240_submission_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mus240_midterm_submissions s
      WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_mus240_grading_rubrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mus240_grading_rubrics_updated_at
  BEFORE UPDATE ON public.mus240_grading_rubrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_grading_rubrics_updated_at();

CREATE OR REPLACE FUNCTION public.update_mus240_submission_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mus240_submission_grades_updated_at
  BEFORE UPDATE ON public.mus240_submission_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_submission_grades_updated_at();

-- Insert default rubrics
INSERT INTO public.mus240_grading_rubrics (question_type, question_id, criteria, total_points) VALUES
('term_definition', 'ring_shout', '{
  "historical_context": {"points": 3, "description": "Correctly identifies time period and cultural context"},
  "musical_elements": {"points": 3, "description": "Identifies key musical characteristics (polyrhythms, call-response, etc.)"},
  "cultural_significance": {"points": 3, "description": "Explains cultural and spiritual importance"},
  "clarity_accuracy": {"points": 1, "description": "Clear writing and factual accuracy"}
}', 10),

('term_definition', 'field_holler', '{
  "historical_context": {"points": 3, "description": "Correctly identifies origins and time period"},
  "musical_elements": {"points": 3, "description": "Describes vocal techniques and improvisational aspects"},
  "cultural_significance": {"points": 3, "description": "Explains communication and resistance functions"},
  "clarity_accuracy": {"points": 1, "description": "Clear writing and factual accuracy"}
}', 10),

('listening_analysis', 'excerpt_analysis', '{
  "genre_identification": {"points": 3, "description": "Correctly identifies musical genre/style"},
  "musical_features": {"points": 4, "description": "Identifies specific musical elements and techniques"},
  "historical_context": {"points": 3, "description": "Explains historical and cultural context"},
  "clarity_accuracy": {"points": 0, "description": "Clear writing and factual accuracy"}
}', 10),

('essay', 'essay_question', '{
  "thesis_argument": {"points": 5, "description": "Clear thesis and well-developed argument"},
  "historical_knowledge": {"points": 5, "description": "Demonstrates understanding of historical context"},
  "musical_connections": {"points": 5, "description": "Makes connections between musical traditions"},
  "evidence_examples": {"points": 3, "description": "Uses specific examples and evidence"},
  "organization_clarity": {"points": 2, "description": "Well-organized and clearly written"}
}', 20);