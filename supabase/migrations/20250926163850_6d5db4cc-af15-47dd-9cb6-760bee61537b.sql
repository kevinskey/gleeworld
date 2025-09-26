-- Create table for detailed test-taking analytics
CREATE TABLE public.mus240_test_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES mus240_midterm_submissions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  event_type text NOT NULL, -- 'question_start', 'question_submit', 'section_complete', 'edit', 'pause', 'resume'
  section_name text, -- 'terms', 'short_answers', 'excerpts', 'essay'
  question_id text, -- specific question identifier
  timestamp_recorded timestamp with time zone NOT NULL DEFAULT now(),
  time_spent_seconds integer, -- time spent on this specific action
  content_length integer, -- length of response when submitted
  edit_count integer DEFAULT 0, -- number of edits made
  keystroke_patterns jsonb, -- typing patterns, pauses, etc.
  ai_indicators jsonb, -- patterns that might suggest AI usage
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for session-level analytics
CREATE TABLE public.mus240_session_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES mus240_midterm_submissions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  total_active_time_seconds integer NOT NULL DEFAULT 0,
  total_pause_time_seconds integer NOT NULL DEFAULT 0,
  section_completion_order text[] DEFAULT '{}',
  average_typing_speed real, -- words per minute
  consistency_score real, -- how consistent their typing/response patterns are
  ai_likelihood_score real DEFAULT 0, -- 0-100 scale
  struggle_areas text[] DEFAULT '{}', -- areas where student spent excessive time
  strength_areas text[] DEFAULT '{}', -- areas completed quickly and accurately
  revision_frequency real DEFAULT 0, -- how often they edit responses
  response_patterns jsonb, -- overall patterns in responses
  browser_info jsonb, -- browser, OS, screen size, etc.
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for AI detection patterns
CREATE TABLE public.mus240_ai_detection_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL UNIQUE,
  pattern_description text,
  detection_rules jsonb NOT NULL, -- rules for detecting this pattern
  weight real NOT NULL DEFAULT 1.0, -- how much this contributes to AI score
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for course-wide analytics
CREATE TABLE public.mus240_course_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester text NOT NULL DEFAULT 'Fall 2025',
  total_students integer NOT NULL DEFAULT 0,
  average_completion_time_minutes real,
  common_struggle_areas text[] DEFAULT '{}',
  common_strength_areas text[] DEFAULT '{}',
  ai_usage_percentage real DEFAULT 0,
  class_performance_trends jsonb,
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_mus240_test_analytics_submission ON mus240_test_analytics(submission_id);
CREATE INDEX idx_mus240_test_analytics_student ON mus240_test_analytics(student_id);
CREATE INDEX idx_mus240_test_analytics_timestamp ON mus240_test_analytics(timestamp_recorded);
CREATE INDEX idx_mus240_session_analytics_student ON mus240_session_analytics(student_id);

-- Insert default AI detection patterns
INSERT INTO public.mus240_ai_detection_patterns (pattern_name, pattern_description, detection_rules, weight) VALUES
('rapid_completion', 'Unusually fast completion of complex questions', 
 '{"max_time_per_100_words": 30, "applies_to": ["essay", "excerpts"]}', 2.0),
('perfect_grammar', 'Responses with unusually perfect grammar and structure', 
 '{"check_patterns": ["complex_sentences", "advanced_vocabulary", "perfect_punctuation"]}', 1.5),
('uniform_response_length', 'All responses are similar in length and structure', 
 '{"variance_threshold": 0.2, "min_responses": 3}', 1.0),
('no_corrections', 'No edits or corrections made during writing', 
 '{"max_edit_count": 1, "applies_to": ["essay"]}', 1.0),
('instantaneous_answers', 'Answers provided immediately without thinking time', 
 '{"max_think_time_seconds": 5, "applies_to": ["short_answers"]}', 2.5);

-- Enable RLS on new tables
ALTER TABLE public.mus240_test_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_ai_detection_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_course_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Instructors can view all test analytics" 
ON public.mus240_test_analytics FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "System can insert test analytics" 
ON public.mus240_test_analytics FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Instructors can view all session analytics" 
ON public.mus240_session_analytics FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "System can manage session analytics" 
ON public.mus240_session_analytics FOR ALL 
USING (true);

CREATE POLICY "Instructors can view AI detection patterns" 
ON public.mus240_ai_detection_patterns FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Instructors can view course analytics" 
ON public.mus240_course_analytics FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create function to calculate AI likelihood score
CREATE OR REPLACE FUNCTION calculate_ai_likelihood_score(
  p_submission_id uuid
) RETURNS real
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_score real := 0;
  pattern_score real;
  pattern_record record;
BEGIN
  -- Loop through each active AI detection pattern
  FOR pattern_record IN 
    SELECT * FROM mus240_ai_detection_patterns WHERE is_active = true
  LOOP
    -- Calculate score for this pattern (simplified logic)
    CASE pattern_record.pattern_name
      WHEN 'rapid_completion' THEN
        SELECT CASE 
          WHEN AVG(time_spent_seconds) < 30 THEN pattern_record.weight
          ELSE 0
        END INTO pattern_score
        FROM mus240_test_analytics 
        WHERE submission_id = p_submission_id 
        AND event_type = 'question_submit'
        AND section_name IN ('essay', 'excerpts');
        
      WHEN 'no_corrections' THEN
        SELECT CASE 
          WHEN COALESCE(SUM(edit_count), 0) <= 1 THEN pattern_record.weight
          ELSE 0
        END INTO pattern_score
        FROM mus240_test_analytics 
        WHERE submission_id = p_submission_id 
        AND section_name = 'essay';
        
      ELSE
        pattern_score := 0;
    END CASE;
    
    total_score := total_score + COALESCE(pattern_score, 0);
  END LOOP;
  
  -- Normalize to 0-100 scale
  RETURN LEAST(total_score * 10, 100);
END;
$$;