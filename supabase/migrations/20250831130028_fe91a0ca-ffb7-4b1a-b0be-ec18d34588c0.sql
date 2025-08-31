-- Create rubrics system for MUS 240 assignments
CREATE TABLE IF NOT EXISTS mus240_assignment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  total_points integer NOT NULL,
  percentage numeric(5,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create rubric criteria table
CREATE TABLE IF NOT EXISTS mus240_rubric_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_type_id uuid REFERENCES mus240_assignment_types(id) ON DELETE CASCADE,
  criterion_name text NOT NULL,
  description text,
  weight_percentage numeric(5,2) NOT NULL,
  max_points integer NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create performance levels table
CREATE TABLE IF NOT EXISTS mus240_performance_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id uuid REFERENCES mus240_rubric_criteria(id) ON DELETE CASCADE,
  level_name text NOT NULL, -- Excellent, Good, Satisfactory, Needs Improvement
  level_value integer NOT NULL, -- 4, 3, 2, 1
  points integer NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student rubric scores table
CREATE TABLE IF NOT EXISTS mus240_rubric_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  criterion_id uuid REFERENCES mus240_rubric_criteria(id) ON DELETE CASCADE,
  performance_level_id uuid REFERENCES mus240_performance_levels(id),
  points_earned integer NOT NULL,
  instructor_comments text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  graded_by uuid REFERENCES gw_profiles(user_id),
  UNIQUE(submission_id, criterion_id)
);

-- Enable RLS on all tables
ALTER TABLE mus240_assignment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE mus240_rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE mus240_performance_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mus240_rubric_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignment types
CREATE POLICY "Everyone can view assignment types" ON mus240_assignment_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage assignment types" ON mus240_assignment_types FOR ALL USING (
  EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))
);

-- RLS Policies for rubric criteria
CREATE POLICY "Everyone can view rubric criteria" ON mus240_rubric_criteria FOR SELECT USING (true);
CREATE POLICY "Admins can manage rubric criteria" ON mus240_rubric_criteria FOR ALL USING (
  EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))
);

-- RLS Policies for performance levels
CREATE POLICY "Everyone can view performance levels" ON mus240_performance_levels FOR SELECT USING (true);
CREATE POLICY "Admins can manage performance levels" ON mus240_performance_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))
);

-- RLS Policies for rubric scores
CREATE POLICY "Students can view their own rubric scores" ON mus240_rubric_scores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignment_submissions 
    WHERE id = mus240_rubric_scores.submission_id 
    AND student_id = auth.uid()
  )
);
CREATE POLICY "Instructors can manage all rubric scores" ON mus240_rubric_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))
);

-- Insert assignment types based on syllabus
INSERT INTO mus240_assignment_types (name, description, total_points, percentage) VALUES
('Listening Journals', 'Weekly listening journals identifying genre, style traits, and cultural significance', 200, 30.77),
('Reflection Papers', 'Essays demonstrating critical thinking about music in cultural context', 150, 23.08),
('Research Project', 'In-depth study of African American music topic with digital presentation', 150, 23.08),
('Midterm Exam', 'Assessment of understanding of music styles, genres, and cultural contexts', 100, 15.38),
('Final Reflection Essay', 'Synthesis of semester learning and personal perspective', 50, 7.69),
('Participation & Discussion', 'Class preparation, contribution, and engagement', 75, 11.54);