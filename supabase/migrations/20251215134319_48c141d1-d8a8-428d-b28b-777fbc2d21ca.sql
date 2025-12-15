-- =============================================
-- GLEE ACADEMY UNIFIED LMS - ALTER EXISTING + NEW TABLES
-- =============================================

-- 1. ALTER gw_courses to add missing columns
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS course_code VARCHAR(20);
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS semester VARCHAR(50) DEFAULT 'SPRING 2026';
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS instructor_id UUID;
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(255);
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS instructor_email VARCHAR(255);
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS instructor_office VARCHAR(255);
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS instructor_hours VARCHAR(255);
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS syllabus_url TEXT;
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS max_enrollment INTEGER;
ALTER TABLE gw_courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add unique constraint on course_code if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gw_courses_course_code_key') THEN
    ALTER TABLE gw_courses ADD CONSTRAINT gw_courses_course_code_key UNIQUE (course_code);
  END IF;
END $$;

-- Enable RLS on gw_courses
ALTER TABLE gw_courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can view active courses" ON gw_courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON gw_courses;

CREATE POLICY "Anyone can view active courses" ON gw_courses
  FOR SELECT USING (is_active = true OR is_active IS NULL);

CREATE POLICY "Admins can manage courses" ON gw_courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- 2. COURSE ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS gw_course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'ta', 'auditor')),
  enrollment_status VARCHAR(50) DEFAULT 'enrolled' CHECK (enrollment_status IN ('pending', 'enrolled', 'completed', 'dropped', 'waitlisted')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  grade VARCHAR(10),
  final_percentage DECIMAL(5,2),
  payment_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, user_id)
);

ALTER TABLE gw_course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own enrollments" ON gw_course_enrollments;
DROP POLICY IF EXISTS "Instructors can view course enrollments" ON gw_course_enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON gw_course_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON gw_course_enrollments;

CREATE POLICY "Users can view their own enrollments" ON gw_course_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can enroll themselves" ON gw_course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage enrollments" ON gw_course_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- 3. COURSE ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS gw_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  assignment_type VARCHAR(50) DEFAULT 'standard',
  points INTEGER DEFAULT 100,
  due_date TIMESTAMPTZ,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  allow_late_submissions BOOLEAN DEFAULT false,
  late_penalty_percent INTEGER DEFAULT 0,
  rubric_id UUID,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_course_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enrolled students can view published assignments" ON gw_course_assignments;
DROP POLICY IF EXISTS "Instructors can manage assignments" ON gw_course_assignments;

CREATE POLICY "Enrolled students can view published assignments" ON gw_course_assignments
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM gw_course_enrollments 
      WHERE course_id = gw_course_assignments.course_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage assignments" ON gw_course_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- 4. SUBMISSION TABLE
CREATE TABLE IF NOT EXISTS gw_course_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES gw_course_assignments(id) ON DELETE CASCADE,
  student_id UUID,
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  word_count INTEGER,
  status VARCHAR(50) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,
  grade DECIMAL(5,2),
  points_earned DECIMAL(5,2),
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  ai_feedback TEXT,
  ai_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE gw_course_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own submissions" ON gw_course_submissions;
DROP POLICY IF EXISTS "Students can submit own work" ON gw_course_submissions;
DROP POLICY IF EXISTS "Students can update own drafts" ON gw_course_submissions;

CREATE POLICY "Students can view own submissions" ON gw_course_submissions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can submit own work" ON gw_course_submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own drafts" ON gw_course_submissions
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Admins can manage submissions" ON gw_course_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- 5. COURSE TESTS TABLE
CREATE TABLE IF NOT EXISTS gw_course_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  test_type VARCHAR(50) DEFAULT 'quiz',
  total_points INTEGER DEFAULT 100,
  duration_minutes INTEGER,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  allow_retakes BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 1,
  show_results_immediately BOOLEAN DEFAULT true,
  randomize_questions BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_course_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enrolled students can view published tests" ON gw_course_tests;
DROP POLICY IF EXISTS "Instructors can manage tests" ON gw_course_tests;

CREATE POLICY "Enrolled students can view published tests" ON gw_course_tests
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM gw_course_enrollments 
      WHERE course_id = gw_course_tests.course_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tests" ON gw_course_tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- 6. COURSE ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS gw_course_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  student_id UUID,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'present',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, student_id, attendance_date)
);

ALTER TABLE gw_course_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attendance" ON gw_course_attendance;
DROP POLICY IF EXISTS "Instructors can manage attendance" ON gw_course_attendance;

CREATE POLICY "Students can view own attendance" ON gw_course_attendance
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can manage attendance" ON gw_course_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- 7. COURSE RUBRICS TABLE
CREATE TABLE IF NOT EXISTS gw_course_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignment_type VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_course_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rubrics" ON gw_course_rubrics FOR SELECT USING (true);

CREATE POLICY "Admins can manage rubrics" ON gw_course_rubrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- 8. RUBRIC CRITERIA TABLE
CREATE TABLE IF NOT EXISTS gw_rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID REFERENCES gw_course_rubrics(id) ON DELETE CASCADE,
  criterion_name VARCHAR(255) NOT NULL,
  description TEXT,
  max_points INTEGER DEFAULT 10,
  weight_percentage DECIMAL(5,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_rubric_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rubric criteria" ON gw_rubric_criteria FOR SELECT USING (true);

-- 9. COURSE LOUNGE POSTS
CREATE TABLE IF NOT EXISTS gw_course_lounge_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  author_id UUID,
  content TEXT NOT NULL,
  media_urls TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_announcement BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_course_lounge_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view lounge posts" ON gw_course_lounge_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gw_course_enrollments 
      WHERE course_id = gw_course_lounge_posts.course_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled users can create posts" ON gw_course_lounge_posts
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM gw_course_enrollments 
      WHERE course_id = gw_course_lounge_posts.course_id 
      AND user_id = auth.uid()
    )
  );

-- 10. COURSE LOUNGE COMMENTS
CREATE TABLE IF NOT EXISTS gw_course_lounge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES gw_course_lounge_posts(id) ON DELETE CASCADE,
  author_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_course_lounge_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view comments" ON gw_course_lounge_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gw_course_lounge_posts p
      JOIN gw_course_enrollments e ON e.course_id = p.course_id
      WHERE p.id = gw_course_lounge_comments.post_id
      AND e.user_id = auth.uid()
    )
  );

-- 11. COURSE CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS gw_course_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) DEFAULT 'class',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location VARCHAR(255),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_course_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view calendar" ON gw_course_calendar
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gw_course_enrollments 
      WHERE course_id = gw_course_calendar.course_id 
      AND user_id = auth.uid()
    )
  );

-- 12. COURSE ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS gw_course_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  send_email BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gw_course_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view announcements" ON gw_course_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gw_course_enrollments 
      WHERE course_id = gw_course_announcements.course_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage announcements" ON gw_course_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON gw_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON gw_course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON gw_course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_submissions_assignment ON gw_course_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_course_submissions_student ON gw_course_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_course_attendance_course_date ON gw_course_attendance(course_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_course_lounge_posts_course ON gw_course_lounge_posts(course_id);