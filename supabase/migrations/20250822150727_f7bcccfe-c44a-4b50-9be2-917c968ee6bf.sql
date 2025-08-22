-- Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-submissions', 'assignment-submissions', false);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id UUID NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  grade NUMERIC(5,2),
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_assignment_submissions_updated_at
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies for assignment submissions
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
  ON public.assignment_submissions
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can create their own submissions
CREATE POLICY "Students can create their own submissions"
  ON public.assignment_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own ungraded submissions
CREATE POLICY "Students can update their own ungraded submissions"
  ON public.assignment_submissions
  FOR UPDATE
  USING (auth.uid() = student_id AND status = 'submitted');

-- Admins and instructors can view all submissions
CREATE POLICY "Instructors can view all submissions"
  ON public.assignment_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Admins and instructors can update submissions (for grading)
CREATE POLICY "Instructors can grade submissions"
  ON public.assignment_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Storage policies for assignment submissions bucket
CREATE POLICY "Students can upload their own assignment files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'assignment-submissions' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Students can view their own assignment files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'assignment-submissions' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Instructors can view all assignment files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'assignment-submissions'
    AND EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );