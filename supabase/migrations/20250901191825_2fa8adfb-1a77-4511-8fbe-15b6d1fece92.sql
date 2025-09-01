-- Create assignments table for MUS 240
CREATE TABLE public.mus240_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 100,
  due_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assignment_type TEXT NOT NULL DEFAULT 'listening_journal',
  rubric JSONB,
  resources TEXT[],
  instructions TEXT
);

-- Enable RLS
ALTER TABLE public.mus240_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for assignments
CREATE POLICY "Instructors can manage all assignments" 
ON public.mus240_assignments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Students can view active assignments" 
ON public.mus240_assignments 
FOR SELECT 
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_mus240_assignments_updated_at
BEFORE UPDATE ON public.mus240_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update mus240_journals to reference assignments table
ALTER TABLE public.mus240_journals 
ADD COLUMN assignment_db_id UUID REFERENCES public.mus240_assignments(id);

-- Create index for performance
CREATE INDEX idx_mus240_journals_assignment_db_id ON public.mus240_journals(assignment_db_id);

-- Update journal grades table to reference assignments
ALTER TABLE public.mus240_journal_grades 
ADD COLUMN assignment_db_id UUID REFERENCES public.mus240_assignments(id);

-- Migrate existing data (create assignments for existing assignment_ids)
INSERT INTO public.mus240_assignments (id, title, description, prompt, points, due_date, assignment_type, created_by)
SELECT 
  gen_random_uuid(),
  'Assignment ' || assignment_id,
  'Listening journal assignment',
  'Write a listening journal for this assignment',
  100,
  now() + interval '1 week',
  'listening_journal',
  (SELECT user_id FROM public.gw_profiles WHERE is_admin = true LIMIT 1)
FROM (
  SELECT DISTINCT assignment_id 
  FROM public.mus240_journals 
  WHERE assignment_id IS NOT NULL
) AS distinct_assignments;