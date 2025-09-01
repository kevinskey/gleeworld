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

-- Update existing journal entries table to reference assignments
ALTER TABLE public.mus240_journal_entries 
ADD COLUMN assignment_db_id UUID REFERENCES public.mus240_assignments(id);

-- Create index for performance
CREATE INDEX idx_mus240_journal_entries_assignment_db_id ON public.mus240_journal_entries(assignment_db_id);

-- Update journal grades table to reference assignments
ALTER TABLE public.mus240_journal_grades 
ADD COLUMN assignment_db_id UUID REFERENCES public.mus240_assignments(id);