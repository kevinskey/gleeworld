-- Create test builder tables

-- Tests table
CREATE TABLE IF NOT EXISTS public.glee_academy_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  duration_minutes INTEGER,
  total_points INTEGER DEFAULT 100,
  passing_score INTEGER DEFAULT 70,
  is_published BOOLEAN DEFAULT false,
  allow_retakes BOOLEAN DEFAULT false,
  show_correct_answers BOOLEAN DEFAULT true,
  randomize_questions BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Question types enum
CREATE TYPE question_type AS ENUM (
  'multiple_choice',
  'true_false', 
  'short_answer',
  'essay',
  'audio_listening',
  'video_watching',
  'file_upload'
);

-- Media types enum
CREATE TYPE media_type AS ENUM (
  'audio',
  'video',
  'image',
  'pdf',
  'youtube',
  'slide'
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.glee_academy_tests(id) ON DELETE CASCADE,
  question_type question_type NOT NULL,
  question_text TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  display_order INTEGER NOT NULL,
  required BOOLEAN DEFAULT true,
  
  -- Media attachments
  media_type media_type,
  media_url TEXT,
  media_title TEXT,
  youtube_video_id TEXT,
  
  -- For audio/video questions
  start_time INTEGER, -- seconds
  end_time INTEGER,   -- seconds
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Answer options for multiple choice/true-false
CREATE TABLE IF NOT EXISTS public.test_answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.test_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student test submissions
CREATE TABLE IF NOT EXISTS public.test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.glee_academy_tests(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_spent_minutes INTEGER,
  status TEXT DEFAULT 'in_progress', -- in_progress, submitted, graded
  total_score NUMERIC(5,2),
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student answers
CREATE TABLE IF NOT EXISTS public.test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.test_submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.test_questions(id) ON DELETE CASCADE,
  
  -- Answer data (different types)
  selected_option_id UUID REFERENCES public.test_answer_options(id),
  text_answer TEXT,
  file_url TEXT,
  
  -- Grading
  points_earned NUMERIC(5,2),
  is_correct BOOLEAN,
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.glee_academy_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tests
CREATE POLICY "Instructors can manage tests" ON public.glee_academy_tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Students can view published tests" ON public.glee_academy_tests
  FOR SELECT USING (is_published = true);

-- RLS Policies for questions
CREATE POLICY "Instructors can manage questions" ON public.test_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Students can view questions for published tests" ON public.test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.glee_academy_tests 
      WHERE id = test_questions.test_id 
      AND is_published = true
    )
  );

-- RLS Policies for answer options
CREATE POLICY "Instructors can manage answer options" ON public.test_answer_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Students can view answer options" ON public.test_answer_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_questions q
      JOIN public.glee_academy_tests t ON t.id = q.test_id
      WHERE q.id = test_answer_options.question_id 
      AND t.is_published = true
    )
  );

-- RLS Policies for submissions
CREATE POLICY "Students can manage their own submissions" ON public.test_submissions
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Instructors can view all submissions" ON public.test_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Instructors can grade submissions" ON public.test_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for answers
CREATE POLICY "Students can manage their own answers" ON public.test_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.test_submissions 
      WHERE id = test_answers.submission_id 
      AND student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_submissions 
      WHERE id = test_answers.submission_id 
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view and grade all answers" ON public.test_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create indexes
CREATE INDEX idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX idx_test_answer_options_question_id ON public.test_answer_options(question_id);
CREATE INDEX idx_test_submissions_test_id ON public.test_submissions(test_id);
CREATE INDEX idx_test_submissions_student_id ON public.test_submissions(student_id);
CREATE INDEX idx_test_answers_submission_id ON public.test_answers(submission_id);
CREATE INDEX idx_test_answers_question_id ON public.test_answers(question_id);

-- Update triggers
CREATE TRIGGER update_glee_academy_tests_updated_at
  BEFORE UPDATE ON public.glee_academy_tests
  FOR EACH ROW EXECUTE Function public.update_updated_at_column();

CREATE TRIGGER update_test_questions_updated_at
  BEFORE UPDATE ON public.test_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_submissions_updated_at
  BEFORE UPDATE ON public.test_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_answers_updated_at
  BEFORE UPDATE ON public.test_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();